import { ethers } from "hardhat";
import { CreditPositionManager } from "../../../typechain";

export async function deployCreditPosition(): Promise<CreditPositionManager> {
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

  const CreditPosition = await ethers.getContractFactory("CreditPositionManager", {
    libraries: {
      NFTTokenURIScaffold: nftTokenURIScaffold.address,
    },
  });

  const creditPosition = (await CreditPosition.deploy()) as CreditPositionManager;
  await creditPosition.deployTransaction.wait();
  return creditPosition;
}

export async function initCreditPosition(creditPosition: CreditPositionManager, routerAddress: string) {
  await creditPosition.initialize("CreditPosition", "CP");
  await creditPosition.grantRoles(routerAddress);
  await creditPosition.setRouter(routerAddress);
}
