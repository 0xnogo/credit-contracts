import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { ethers, waffle } from "hardhat";

import { IERC20 } from "../../../typechain/IERC20";
import { IFactory } from "../../../typechain/IFactory";
import { factoryInit } from "../../utils/shared/Factory";
import { testTokenNew } from "../../utils/shared/TestToken";

import { BigNumber, Contract } from "ethers";
import { UpgradeableBeacon } from "../../../typechain";
import { getEvent } from "../../utils/helper";

const { solidity } = waffle;
chai.use(solidity);
const { expect } = chai;

describe("Core#Pair", () => {
  let signers: SignerWithAddress[];
  let assetToken: IERC20;
  let collateralToken: IERC20;
  let creditPairCallee: Contract;
  let pairContract: Contract;
  let assetValue: BigNumber;
  let collateralValue: BigNumber;
  let xMint: BigNumber;
  let yMint: BigNumber;
  let zMint: BigNumber;
  let xFirstBorrow: BigNumber;
  let yFirstBorrow: BigNumber;
  let zFirstBorrow: BigNumber;
  let xSecondBorrow: BigNumber;
  let ySecondBorrow: BigNumber;
  let zSecondBorrow: BigNumber;
  let maturity: number;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    const creditMathFactory = await ethers.getContractFactory("CreditMath");
    const creditMathContractAddress = (await creditMathFactory.deploy()).address;

    const creditPairFactory = await ethers.getContractFactory("CreditPair", {
      libraries: { CreditMath: creditMathContractAddress },
    });
    const upgradeableBeaconFactory = await ethers.getContractFactory("UpgradeableBeacon");

    const creditPair = await creditPairFactory.deploy();

    const upgradeableBeacon = (await upgradeableBeaconFactory.deploy(
      creditPair.address
    )) as unknown as UpgradeableBeacon;

    const factory = (await factoryInit(
      signers[0].address,
      signers[0].address,
      signers[0].address,
      upgradeableBeacon.address,
      undefined,
      undefined,
      undefined
    )) as unknown as IFactory;

    assetToken = (await testTokenNew("Ether", "WETH", 100000000000000000000000n)) as unknown as IERC20;
    collateralToken = (await testTokenNew("Matic", "MATIC", 100000000000000000000000n)) as unknown as IERC20;

    // variable definition
    xMint = BigNumber.from("100000000000000000000");
    yMint = BigNumber.from("17753675063523091734082");
    zMint = BigNumber.from("932750769584532626");

    xFirstBorrow = BigNumber.from("50341389513778267429");
    yFirstBorrow = BigNumber.from("7439968766729610348990");
    zFirstBorrow = BigNumber.from("390884510841937656");

    xSecondBorrow = BigNumber.from("5034125415913877078");
    ySecondBorrow = BigNumber.from("1383093131104023486809");
    zSecondBorrow = BigNumber.from("72665584890363048");

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    maturity = now + 3600 * 24;

    assetValue = ethers.utils.parseEther("100");
    collateralValue = ethers.utils.parseEther("1");

    // create a pair
    await factory.connect(signers[0]).createPair(assetToken.address, collateralToken.address);
    const pair = await factory.getPair(assetToken.address, collateralToken.address);
    pairContract = await ethers.getContractAt("CreditPair", pair);

    // deploy CreditPairCallee
    const CreditPairCalleeFactory = await ethers.getContractFactory("CreditPairCallee");
    creditPairCallee = await CreditPairCalleeFactory.deploy(pairContract.address);

    // add liquidity
    await assetToken.approve(creditPairCallee.address, assetValue);
    await collateralToken.approve(creditPairCallee.address, collateralValue);
    await creditPairCallee.connect(signers[0]).mint(maturity, signers[0].address, xMint, yMint, zMint);

    // first borrow
    await collateralToken.approve(creditPairCallee.address, ethers.utils.parseEther("1"));
    await creditPairCallee.borrow(
      maturity,
      signers[0].address,
      creditPairCallee.address,
      xFirstBorrow,
      yFirstBorrow,
      zFirstBorrow
    );

    // second borrow
    await collateralToken.approve(creditPairCallee.address, ethers.utils.parseEther("1"));
    await creditPairCallee.borrow(
      maturity,
      signers[0].address,
      creditPairCallee.address,
      xSecondBorrow,
      ySecondBorrow,
      zSecondBorrow
    );
  });

  describe("Create Pair", () => {
    it("should flag all dues as paid when sending enough asset", async () => {
      // call pay with the CP ids [0, 1] with enough to pay the 2
      const firstDebtIn = await pairContract.dueOf(maturity, creditPairCallee.address, 0);
      const secondDebtIn = await pairContract.dueOf(maturity, creditPairCallee.address, 1);

      const assetsIn = [firstDebtIn[0], secondDebtIn[0]];
      const collateralsOut = [firstDebtIn[1], secondDebtIn[1]];

      await assetToken.approve(creditPairCallee.address, firstDebtIn[0].add(firstDebtIn[0]));
      await collateralToken.approve(creditPairCallee.address, firstDebtIn[1].add(secondDebtIn[1]));

      const tx = await creditPairCallee.pay(
        maturity,
        signers[0].address,
        creditPairCallee.address,
        [0, 1],
        assetsIn,
        collateralsOut
      );
      const receipt = await tx.wait();

      // check that debt and collateral is 0

      expect((await pairContract.dueOf(maturity, creditPairCallee.address, 0))[0]).to.eq(0);
      expect((await pairContract.dueOf(maturity, creditPairCallee.address, 1))[0]).to.eq(0);

      expect((await pairContract.dueOf(maturity, creditPairCallee.address, 0))[1]).to.eq(0);
      expect((await pairContract.dueOf(maturity, creditPairCallee.address, 1))[1]).to.eq(0);

      // check that the duesFullyPaid enitted are [0, 1]
      const event = getEvent(pairContract.interface, receipt, "Pay");
      expect(event[0].args["duesFullyPaid"]).to.be.deep.eq([BigNumber.from(0), BigNumber.from(1)]);
    });

    it("should not flag due as paid when sending not enough asset for the first asset", async () => {
      // call pay with the CP ids [0, 1] with enough to pay for 0 and half of 1
      const firstDebtIn = await pairContract.dueOf(maturity, creditPairCallee.address, 0);
      const secondDebtIn = await pairContract.dueOf(maturity, creditPairCallee.address, 1);

      const assetsIn = [firstDebtIn[0], secondDebtIn[0].div(2)];
      const collateralsOut = [firstDebtIn[1], secondDebtIn[1].div(2)];

      await assetToken.approve(creditPairCallee.address, firstDebtIn[0].add(firstDebtIn[0]));
      await collateralToken.approve(creditPairCallee.address, firstDebtIn[1].add(secondDebtIn[1]));

      const tx = await creditPairCallee.pay(
        maturity,
        signers[0].address,
        creditPairCallee.address,
        [0, 1],
        assetsIn,
        collateralsOut
      );
      const receipt = await tx.wait();

      // check that debt and collateral is 0
      expect((await pairContract.dueOf(maturity, creditPairCallee.address, 0))[0]).to.eq(0);
      expect((await pairContract.dueOf(maturity, creditPairCallee.address, 1))[0]).to.eq(secondDebtIn[0].div(2));

      expect((await pairContract.dueOf(maturity, creditPairCallee.address, 0))[1]).to.eq(0);
      expect((await pairContract.dueOf(maturity, creditPairCallee.address, 1))[1]).to.closeTo(
        secondDebtIn[1].div(2),
        BigNumber.from(1) // rounding precision
      );

      // check that the duesFullyPaid enitted are [0]
      const event = getEvent(pairContract.interface, receipt, "Pay");
      expect(event[0].args["duesFullyPaid"]).to.be.deep.eq([BigNumber.from(0)]);
    });
  });
});
