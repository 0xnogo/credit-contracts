import { ethers, upgrades } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const CreditPositionSVG = await deploy("CreditPositionSVG", {
    from: deployer,
    log: true,
  });

  const NFTTokenURIScaffold = await deploy("NFTTokenURIScaffold", {
    from: deployer,
    log: true,
    libraries: {
      CreditPositionSVG: CreditPositionSVG.address,
    },
  });

  const CreditPosition = await ethers.getContractFactory("CreditPositionManager", {
    libraries: {
      NFTTokenURIScaffold: NFTTokenURIScaffold.address,
    },
  });

  const creditPosition = await upgrades.deployProxy(CreditPosition, ["CreditPosition", "CP"], {
    initializer: "initialize",
    unsafeAllow: ["external-library-linking"],
  });

  await creditPosition.deployed();
  deployments.save("CreditPosition", { abi: [], address: creditPosition.address });
  console.log("CreditPosition deployed: ", creditPosition.address);
};

export default func;
func.tags = ["CreditPosition", "CoreProtocol"];
func.dependencies = ["Core", "ReceiptTokens"];
