import { ethers, upgrades } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const factoryAddress = (await deployments.get("CreditFactory")).address;

  const creditPositionAddress = (await deployments.get("CreditPosition")).address;
  const creditPosition = await ethers.getContractAt("CreditPositionManager", creditPositionAddress);

  let wethAddress: string = (await deployments.get("WETH")).address;

  const Borrow = await deploy("Borrow", {
    from: deployer,
    log: true,
  });
  console.log("Borrow", Borrow.address);

  const Lend = await deploy("Lend", {
    from: deployer,
    log: true,
  });

  const Mint = await deploy("Mint", {
    from: deployer,
    log: true,
  });

  const Burn = await deploy("Burn", {
    from: deployer,
    log: true,
  });

  const Pay = await deploy("Pay", {
    from: deployer,
    log: true,
  });

  const Withdraw = await deploy("Withdraw", {
    from: deployer,
    log: true,
  });

  const Router = await ethers.getContractFactory("CreditRouter", {
    libraries: {
      Borrow: Borrow.address,
      Lend: Lend.address,
      Mint: Mint.address,
      Burn: Burn.address,
      Pay: Pay.address,
      Withdraw: Withdraw.address,
    },
  });

  const router = await upgrades.deployProxy(Router, [factoryAddress, wethAddress, creditPosition.address], {
    initializer: "initialize",
    unsafeAllow: ["external-library-linking"],
  });
  await router.deployed();

  console.log("Router deployed: ", router.address);
  deployments.save("Router", { abi: [], address: router.address });

  await creditPosition.grantRoles(router.address);
  await creditPosition.setRouter(router.address);
};

export default func;
func.tags = ["Router", "CoreProtocol"];
func.dependencies = ["CreditFactory", "ReceiptTokens", "CreditPosition", "WETH"];
