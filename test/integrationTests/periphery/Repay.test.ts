import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { BigNumber, ContractReceipt } from "ethers";
import { ethers, waffle } from "hardhat";
import {
  borrowGivenPercent,
  borrowGivenPercentETHAsset,
  borrowGivenPercentETHCollateral,
} from "../../utils/fixtures/Borrow";
import { DeploymentContext, createDeploymentContextFixture } from "../../utils/fixtures/Deploy";
import { newLiquidity, newLiquidityETHAsset, newLiquidityETHCollateral } from "../../utils/fixtures/Liquidity";
import { repay, repayETHAsset, repayETHCollateral } from "../../utils/fixtures/Repay";
import { getEvent, now } from "../../utils/helper";
import { getRepayState } from "../../utils/state";

const { solidity, loadFixture } = waffle;
chai.use(solidity);
const { expect } = chai;

const newLiquidityParams = {
  assetIn: ethers.utils.parseEther("10000"),
  debtIn: ethers.utils.parseEther("12000"),
  collateralIn: ethers.utils.parseEther("1000"),
};

const borrowGivenPercentParams = {
  assetOut: ethers.utils.parseEther("1000"),
  maxDebt: ethers.utils.parseEther("1200"),
  maxCollateral: ethers.utils.parseEther("5000"),
  percent: BigNumber.from(2).pow(31), // 50%
};

const repayParams = {
  creditPositionIds: [BigNumber.from(1)],
  maxAssetsIn: [ethers.utils.parseEther("1200")],
};

let signers = [];

async function fixture(): Promise<DeploymentContext> {
  return await createDeploymentContextFixture(signers[0], signers[9].address);
}

describe("integration tests", () => {
  let maturity: BigNumber;
  before(async () => {
    signers = await ethers.getSigners();
    maturity = (await now()).add(BigNumber.from(315360000));
    await signers[1].sendTransaction({
      to: ethers.Wallet.createRandom().address,
      value: ethers.utils.parseEther("10000000000"),
    });
  });

  describe("repay", () => {
    it("given Repay when collect then collateral is claimed and credit position is burnt", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await context.collateralToken.mint(signers[1].address, borrowGivenPercentParams.maxCollateral);
      await context.collateralToken
        .connect(signers[1])
        .approve(context.router.address, borrowGivenPercentParams.maxCollateral);
      await newLiquidity(context, maturity, newLiquidityParams, signers[0]);
      await borrowGivenPercent(context, maturity, borrowGivenPercentParams, signers[1]);
      // simulate interest
      await context.assetToken.mint(
        signers[1].address,
        borrowGivenPercentParams.maxDebt.sub(borrowGivenPercentParams.assetOut)
      );
      const beforeState = await getRepayState(context, maturity, signers[1]);

      // WHEN
      await context.assetToken.connect(signers[1]).approve(context.router.address, borrowGivenPercentParams.maxDebt);
      await context.creditPositionManager.connect(signers[1]).approve(context.router.address, 1);
      const receipt = await repay(context, maturity, repayParams, signers[1]);

      // THEN
      await assertRepay(context, maturity, receipt, beforeState, BigNumber.from(1), signers[1]);
    });

    it("given Repay when repayETHAsset then collateral is claimed and credit position is burnt", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await context.collateralToken.mint(signers[1].address, borrowGivenPercentParams.maxDebt);
      await context.collateralToken
        .connect(signers[1])
        .approve(context.router.address, borrowGivenPercentParams.maxDebt);
      await newLiquidityETHAsset(context, maturity, newLiquidityParams, signers[0]);
      await borrowGivenPercentETHAsset(context, maturity, borrowGivenPercentParams, signers[1]);
      const beforeState = await getRepayState(context, maturity, signers[1], true);

      // WHEN
      await context.creditPositionManager.connect(signers[1]).approve(context.router.address, 1);
      const receipt = await repayETHAsset(context, maturity, repayParams, signers[1], borrowGivenPercentParams.maxDebt);

      // THEN
      await assertRepay(context, maturity, receipt, beforeState, BigNumber.from(1), signers[1], true);
    });

    it("given Repay when repayETHCollateral then collateral is claimed and credit position is burnt", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await context.assetToken.mint(signers[1].address, borrowGivenPercentParams.assetOut);
      await context.assetToken.connect(signers[1]).approve(context.router.address, borrowGivenPercentParams.assetOut);
      await newLiquidityETHCollateral(context, maturity, newLiquidityParams, signers[0]);
      await borrowGivenPercentETHCollateral(context, maturity, borrowGivenPercentParams, signers[1]);
      // simulate interest
      await context.assetToken.mint(
        signers[1].address,
        borrowGivenPercentParams.maxDebt.sub(borrowGivenPercentParams.assetOut)
      );
      const beforeState = await getRepayState(context, maturity, signers[1], false, true);

      // WHEN
      await context.assetToken.connect(signers[1]).approve(context.router.address, borrowGivenPercentParams.maxDebt);
      await context.creditPositionManager.connect(signers[1]).approve(context.router.address, 1);
      const receipt = await repayETHCollateral(context, maturity, repayParams, signers[1]);

      // THEN
      await assertRepay(context, maturity, receipt, beforeState, BigNumber.from(1), signers[1], false, true);
    });

    it("should send correct collateral with multiple debt created", async () => {
      // set up the test
      const context = await loadFixture(fixture);
      await context.collateralToken.mint(signers[1].address, borrowGivenPercentParams.maxCollateral);
      await context.collateralToken
        .connect(signers[1])
        .approve(context.router.address, borrowGivenPercentParams.maxCollateral);
      await newLiquidity(context, maturity, newLiquidityParams, signers[0]);

      const borrowGivenPercentParams2 = {
        assetOut: ethers.utils.parseEther("6000"),
        maxDebt: ethers.utils.parseEther("8000"),
        maxCollateral: ethers.utils.parseEther("10000"),
        percent: BigNumber.from(2).pow(31), // 50%
      };

      const borrowGivenPercentParams3 = {
        assetOut: ethers.utils.parseEther("1000"),
        maxDebt: ethers.utils.parseEther("1700"),
        maxCollateral: ethers.utils.parseEther("5000"),
        percent: BigNumber.from(2).pow(31), // 50%
      };

      await borrowGivenPercent(context, maturity, borrowGivenPercentParams2, signers[1]);
      await borrowGivenPercent(context, maturity, borrowGivenPercentParams3, signers[1]);
      // simulate interest
      await context.assetToken.mint(
        signers[1].address,
        borrowGivenPercentParams.maxDebt.sub(borrowGivenPercentParams3.assetOut)
      );

      // repaying the second debt
      await context.assetToken.connect(signers[1]).approve(context.router.address, borrowGivenPercentParams3.maxDebt);
      await context.creditPositionManager.connect(signers[1]).approve(context.router.address, 1);
      await context.creditPositionManager.connect(signers[1]).approve(context.router.address, 2);

      const receipt = await repay(
        context,
        maturity,
        {
          creditPositionIds: [BigNumber.from(2)],
          maxAssetsIn: [ethers.utils.parseEther("1700")],
        },
        signers[1]
      );

      // get the Repay event
      const pairAddress = await context.creditPositionManager.getPair(2);
      const creditPair = await ethers.getContractAt("CreditPair", pairAddress);
      const payEvent = getEvent(creditPair.interface, receipt, "Pay");
      const collateralOut = payEvent[0].args["collateralOut"];
      const assetIn = payEvent[0].args["assetIn"];
      const ldtId = payEvent[0].args["duesFullyPaid"];

      // then only the second debt should be repaid (ldt=1)
      expect(assetIn).to.lte(borrowGivenPercentParams3.maxDebt);
      expect(collateralOut).to.be.lte(borrowGivenPercentParams3.maxCollateral);
      expect(ldtId).to.be.deep.eq([BigNumber.from(1)]);
    });

    it("should burn the correct ids when multiple debt are paid with different level", async () => {
      // set up the test
      const context = await loadFixture(fixture);
      await context.collateralToken.mint(signers[1].address, borrowGivenPercentParams.maxCollateral);
      await context.collateralToken
        .connect(signers[1])
        .approve(context.router.address, borrowGivenPercentParams.maxCollateral);
      await newLiquidity(context, maturity, newLiquidityParams, signers[0]);

      const borrowGivenPercentParams2 = {
        assetOut: ethers.utils.parseEther("6000"),
        maxDebt: ethers.utils.parseEther("8000"),
        maxCollateral: ethers.utils.parseEther("10000"),
        percent: BigNumber.from(2).pow(31), // 50%
      };

      const borrowGivenPercentParams3 = {
        assetOut: ethers.utils.parseEther("1000"),
        maxDebt: ethers.utils.parseEther("1700"),
        maxCollateral: ethers.utils.parseEther("5000"),
        percent: BigNumber.from(2).pow(31), // 50%
      };

      await borrowGivenPercent(context, maturity, borrowGivenPercentParams2, signers[1]);
      await borrowGivenPercent(context, maturity, borrowGivenPercentParams3, signers[1]);
      // simulate interest
      await context.assetToken.mint(
        signers[1].address,
        borrowGivenPercentParams2.maxDebt.add(borrowGivenPercentParams2.assetOut)
      );
      await context.assetToken.mint(
        signers[1].address,
        borrowGivenPercentParams3.maxDebt.add(borrowGivenPercentParams3.assetOut)
      );

      // snapshot the cpId 2
      const cpDebtTokenBefore = await context.creditPositionManager.dueOf(2);

      // repaying the cp id 1 at 100% and 2 at 50%
      await context.assetToken
        .connect(signers[1])
        .approve(context.router.address, borrowGivenPercentParams3.maxDebt.add(borrowGivenPercentParams2.maxDebt));
      await context.creditPositionManager.connect(signers[1]).approve(context.router.address, 1);
      await context.creditPositionManager.connect(signers[1]).approve(context.router.address, 2);

      console.log(await context.creditPositionManager.getPositionType(1));
      const receipt = await repay(
        context,
        maturity,
        {
          creditPositionIds: [BigNumber.from(1), BigNumber.from(2)],
          maxAssetsIn: [ethers.utils.parseEther("8000"), cpDebtTokenBefore.debt.div(2)],
        },
        signers[1]
      );

      // get the Repay event
      const pairAddress = await context.creditPositionManager.getPair(2);
      const creditPair = await ethers.getContractAt("CreditPair", pairAddress);
      const payEvent = getEvent(creditPair.interface, receipt, "Pay");
      const collateralOut = payEvent[0].args["collateralOut"];
      const assetIn = payEvent[0].args["assetIn"];
      const ldtId = payEvent[0].args["duesFullyPaid"];

      // then only the second debt should be repaid (ldt=1)
      expect(assetIn).to.lte(borrowGivenPercentParams3.maxDebt.add(borrowGivenPercentParams2.maxDebt));
      expect(collateralOut).to.be.lte(borrowGivenPercentParams2.maxCollateral);
      expect(ldtId).to.be.deep.eq([BigNumber.from(0)]);

      // check on the cpId 2
      const cpDebtTokenAfter = await context.creditPositionManager.dueOf(2);

      expect(cpDebtTokenBefore.debt.sub(cpDebtTokenAfter.debt)).to.be.eq(cpDebtTokenBefore.debt.div(2));
      expect(cpDebtTokenBefore.collateral.sub(cpDebtTokenAfter.collateral)).to.be.eq(
        cpDebtTokenBefore.collateral.div(2)
      );

      // check on the cpId 1
      await expect(context.creditPositionManager.dueOf(1)).to.be.revertedWith("E409");
      expect(await context.creditPositionManager.creditPositionOf(0)).to.be.eq(BigNumber.from(0)); // should be 1 but id is removed since burned
    });
  });
});

async function assertRepay(
  context: DeploymentContext,
  maturity: BigNumber,
  receipt: ContractReceipt,
  beforeState: any,
  creditPositionId: BigNumber,
  receiver: SignerWithAddress,
  isETHAsset = false,
  isETHCollateral = false
) {
  const currentState = await getRepayState(context, maturity, receiver, isETHAsset, isETHCollateral);
  const cpDebtTokens = await context.creditPositionManager.getPositions(creditPositionId);
  const payEvent = getEvent(currentState.pairContract.interface, receipt, "Pay");
  const assetIn = payEvent[0].args["assetIn"];
  const collateralOut = payEvent[0].args["collateralOut"];

  // balance
  expect(beforeState.userAssetBalance.sub(currentState.userAssetBalance)).to.be.closeTo(
    assetIn,
    ethers.utils.parseEther("0.01")
  );
  expect(currentState.userCollateralBalance.sub(beforeState.userCollateralBalance)).to.be.closeTo(
    collateralOut,
    ethers.utils.parseEther("0.01")
  );

  expect(currentState.assetPairBalance.sub(beforeState.assetPairBalance)).to.be.equal(assetIn);
  expect(beforeState.collateralPairBalance.sub(currentState.collateralPairBalance)).to.be.equal(collateralOut);

  // credit position
  expect(await context.creditPositionManager.nextTokenIdToMint()).to.be.eq(2);
  expect(await context.creditPositionManager.getPositionType(creditPositionId)).to.be.eq(0);
  expect(await context.creditPositionManager.getPair(creditPositionId)).to.be.eq(ethers.constants.AddressZero);
  expect(await context.creditPositionManager.getMaturity(creditPositionId)).to.be.eq(0);
  expect(cpDebtTokens.pair).to.be.eq(ethers.constants.AddressZero);
  expect(cpDebtTokens.maturity).to.be.eq(0);
  expect(cpDebtTokens.positionType).to.be.eq(0);
  expect(cpDebtTokens.slot0).to.be.eq(0);
  expect(cpDebtTokens.slot1).to.be.eq(0);
  expect(cpDebtTokens.slot2).to.be.eq(0);
  expect(cpDebtTokens.slot3).to.be.eq(0);
  await expect(context.creditPositionManager.ownerOf(creditPositionId)).to.be.reverted;
  await expect(repay(context, maturity, repayParams, receiver)).to.be.reverted;

  // pair
  expect(currentState.assetReservePair.sub(beforeState.assetReservePair)).to.be.equal(assetIn);
  expect(beforeState.collateralReservePair.sub(currentState.collateralReservePair)).to.be.equal(collateralOut);
}
