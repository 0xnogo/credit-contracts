import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, upgrades } from "hardhat";
import { CreditFactory, CreditPositionManager, CreditRouter, TestToken, WETH9 } from "../../../typechain";
import { testTokenNew } from "../helper";

export interface DeploymentContext {
  router: CreditRouter;
  creditPositionManager: CreditPositionManager;
  assetToken: TestToken;
  collateralToken: TestToken;
}

export async function createDeploymentContextFixture(
  deployer: SignerWithAddress,
  distributor
): Promise<DeploymentContext> {
  const assetToken = await testTokenNew("DAI", "DAI", ethers.utils.parseEther("1000000000"));
  const collateralToken = await testTokenNew("Matic", "MATIC", ethers.utils.parseEther("1000000000"));

  const creditPositionManager = await deployCreditPosition();
  const { router } = await deployRouter(deployer, creditPositionManager, distributor);

  await initCreditPosition(creditPositionManager, router.address);

  await assetToken.approve(router.address, ethers.constants.MaxUint256);
  await collateralToken.approve(router.address, ethers.constants.MaxUint256);

  return { router, creditPositionManager, assetToken, collateralToken };
}

async function deployRouter(
  deployer: SignerWithAddress,
  creditPosition: CreditPositionManager,
  distributor
): Promise<{ router: CreditRouter; factory: CreditFactory }> {
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
  factoryContract.initialize(deployer.address, distributor, upgradeableBeacon.address, 100, 50, 50);

  const wethContract = (await WETH9.deploy()) as WETH9;

  const beacon = await upgrades.deployBeacon(Router, { unsafeAllow: ["external-library-linking"] });
  await beacon.deployed();

  const routerContract = (await upgrades.deployBeaconProxy(beacon, Router, [
    factoryContract.address,
    wethContract.address,
    creditPosition.address,
  ])) as CreditRouter;

  return { router: routerContract, factory: factoryContract };
}

async function deployCreditPosition(): Promise<CreditPositionManager> {
  const CreditPositionSVG = await ethers.getContractFactory("CreditPositionSVG");
  const creditPositionSVG = await CreditPositionSVG.deploy();
  await creditPositionSVG.deployTransaction.wait();

  const NFTTokenURIScaffold = await ethers.getContractFactory("NFTTokenURIScaffold", {
    libraries: {
      CreditPositionSVG: creditPositionSVG.address,
    },
  });
  const nftTokenURIScaffold = await NFTTokenURIScaffold.deploy();
  await nftTokenURIScaffold.deployTransaction.wait();

  const CreditPositionManager = await ethers.getContractFactory("CreditPositionManager", {
    libraries: {
      NFTTokenURIScaffold: nftTokenURIScaffold.address,
    },
  });

  const creditPositionManager = (await CreditPositionManager.deploy()) as CreditPositionManager;
  await creditPositionManager.deployTransaction.wait();
  return creditPositionManager;
}

async function initCreditPosition(creditPosition: CreditPositionManager, routerAddress: string) {
  await creditPosition.initialize("CreditPosition", "CP");
  await creditPosition.grantRoles(routerAddress);
  await creditPosition.setRouter(routerAddress);
}
