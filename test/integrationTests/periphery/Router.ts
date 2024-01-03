import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { ethers, upgrades, waffle } from "hardhat";

import { CreditFactory, CreditRouter, WETH9 } from "../../../typechain";
import { testTokenNew } from "../../utils/helper";

const { solidity } = waffle;
chai.use(solidity);
const { expect } = chai;

interface DeploymentContext {
  factory: any;
  weth: any;
  router: any;
  Borrow: string;
  Lend: string;
  Mint: string;
  Burn: string;
  Pay: string;
  Withdraw: string;
}
describe("Router", () => {
  let signers: SignerWithAddress[];
  let deployContext: DeploymentContext;
  let assetToken;
  let collateralToken;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    // inputs are not used in this test
    deployContext = await deployRouter(signers[0]);

    assetToken = await testTokenNew("DAI", "DAI", ethers.utils.parseEther("1000000000"));
    collateralToken = await testTokenNew("Arbitrum", "ARB", ethers.utils.parseEther("1000000000"));
  });

  describe("Pair creation", () => {
    it("should create pair if called by owner", async () => {
      await deployContext.router.deployPair({ asset: assetToken.address, collateral: collateralToken.address });

      expect(await deployContext.factory.getPair(assetToken.address, collateralToken.address)).to.not.equal(
        ethers.constants.AddressZero
      );
    });

    it("should create pair if called by non-owner", async () => {
      await deployContext.router
        .connect(signers[1])
        .deployPair({ asset: assetToken.address, collateral: collateralToken.address });

      expect(await deployContext.factory.getPair(assetToken.address, collateralToken.address)).to.not.equal(
        ethers.constants.AddressZero
      );
    });
  });

  describe("Upgradeability", () => {
    it("Upgrade the Router contract with owner", async () => {
      const RouterV2 = await ethers.getContractFactory("CreditRouterV2");

      const routerAddress = deployContext.router.address;
      await expect(
        signers[0].sendTransaction({
          to: routerAddress,
          data: RouterV2.interface.encodeFunctionData("newMethod", []),
        })
      ).to.be.revertedWith("function selector was not recognized and there's no fallback function");

      await upgrades.upgradeProxy(deployContext.router, RouterV2, {
        unsafeAllow: ["external-library-linking"],
      });
      const upgraded = RouterV2.attach(routerAddress);

      await upgraded.initializeV2(42);

      expect(await upgraded.newMethod()).to.eq("hello I am new");
      expect(await upgraded.newValue()).to.eq(42);
      expect(await upgraded.factory()).to.eq(deployContext.factory.address);
      expect(await upgraded.weth()).to.eq(deployContext.weth.address);

      await expect(upgraded.initializeV2(42)).to.be.revertedWith("CreditRouterV2: V2 already initialized");
    });

    it("Upgrade the Router contract with non-owner should fail", async () => {
      const RouterV2 = await ethers.getContractFactory("CreditRouterV2");

      await expect(
        upgrades.upgradeProxy(deployContext.router, RouterV2.connect(signers[1]), {
          unsafeAllow: ["external-library-linking"],
        })
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});

async function deployRouter(deployer: SignerWithAddress): Promise<DeploymentContext> {
  const CreditPositionSVG = await ethers.getContractFactory("CreditPositionSVG");
  const creditPositionSVG = await CreditPositionSVG.deploy();
  await creditPositionSVG.deployTransaction.wait();

  const nftTokenURI = await ethers.getContractFactory("NFTTokenURIScaffold", {
    libraries: {
      CreditPositionSVG: creditPositionSVG.address,
    },
  });
  const nftTokenURIContract = await nftTokenURI.deploy();
  await nftTokenURIContract.deployTransaction.wait();

  const libraryNames1 = ["Borrow", "Lend", "Mint"];
  const libraryContractAddresses1: string[] = [];

  for (const library of libraryNames1) {
    const name = await ethers.getContractFactory(library);
    const contract = await name.deploy();
    await contract.deployTransaction.wait();
    libraryContractAddresses1.push(contract.address);
  }

  const libraryNames2 = ["Burn", "Pay", "Withdraw"];
  const libraryContractAddresses2: string[] = [];

  for (const library of libraryNames2) {
    const name = await ethers.getContractFactory(library);
    const contract = await name.deploy();
    await contract.deployTransaction.wait();
    libraryContractAddresses2.push(contract.address);
  }

  const Router = await ethers.getContractFactory("CreditRouter", {
    libraries: {
      Borrow: libraryContractAddresses1[0],
      Lend: libraryContractAddresses1[1],
      Mint: libraryContractAddresses1[2],
      Burn: libraryContractAddresses2[0],
      Pay: libraryContractAddresses2[1],
      Withdraw: libraryContractAddresses2[2],
    },
  });
  const WETH9 = await ethers.getContractFactory("WETH9");

  const CreditMathFactory = await ethers.getContractFactory("CreditMath");
  const CreditMath = await CreditMathFactory.deploy();

  const creditPairFactory = await ethers.getContractFactory("CreditPair", {
    libraries: { CreditMath: CreditMath.address },
  });
  const upgradeableBeaconFactory = await ethers.getContractFactory("UpgradeableBeacon");

  const creditPair = await creditPairFactory.deploy();

  const upgradeableBeacon = await upgradeableBeaconFactory.deploy(creditPair.address);

  await CreditMath.deployTransaction.wait();
  const Factory = await ethers.getContractFactory("CreditFactory");

  let factoryContract = (await Factory.deploy()) as CreditFactory;
  await factoryContract.deployTransaction.wait();
  factoryContract.initialize(deployer.address, deployer.address, upgradeableBeacon.address, 100, 50, 50);

  const wethContract = (await WETH9.deploy()) as WETH9;
  await wethContract.deployTransaction.wait();

  const creditPositionFactory = await ethers.getContractFactory("CreditPositionManager", {
    libraries: {
      NFTTokenURIScaffold: nftTokenURIContract.address,
    },
  });
  const creditPosition = await creditPositionFactory.deploy();

  const router = (await upgrades.deployProxy(
    Router,
    [factoryContract.address, wethContract.address, creditPosition.address],
    {
      initializer: "initialize",
      unsafeAllow: ["external-library-linking"],
    }
  )) as CreditRouter;

  const deployedContracts = {
    factory: factoryContract,
    weth: wethContract,
    router: router,
    Borrow: libraryContractAddresses1[0],
    Lend: libraryContractAddresses1[1],
    Mint: libraryContractAddresses1[2],
    Burn: libraryContractAddresses2[0],
    Pay: libraryContractAddresses2[1],
    Withdraw: libraryContractAddresses2[2],
  };

  return deployedContracts;
}
