import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const usdcFake = await deploy("ERC20PresetMinterPauser", {
    from: deployer,
    log: true,
    args: ["USDC", "USDC"],
  });

  const arbFake = await deploy("ERC20PresetMinterPauser", {
    from: deployer,
    log: true,
    args: ["Arbitrum", "ARB"],
  });

  deployments.save("USDC", { abi: [], address: usdcFake.address });
  deployments.save("Arbitrum", { abi: [], address: arbFake.address });

  const faucet = await deploy("Faucet", {
    from: deployer,
    log: true,
  });

  const faucetContract = await hre.ethers.getContractAt("Faucet", faucet.address);

  // grant minter role to faucet
  const usdcFakeContract = await hre.ethers.getContractAt("ERC20PresetMinterPauser", usdcFake.address);
  const minterRole = await usdcFakeContract.MINTER_ROLE();
  await usdcFakeContract.grantRole(minterRole, faucet.address);

  const arbFakeContract = await hre.ethers.getContractAt("ERC20PresetMinterPauser", arbFake.address);
  await arbFakeContract.grantRole(minterRole, faucet.address);

  console.log("Faucet deployed at: ", faucet.address);
  deployments.save("Faucet", { abi: [], address: faucet.address });

  console.log("USDC deployed at: ", usdcFake.address);
  deployments.save("USDC", { abi: [], address: usdcFake.address });

  console.log("Arbitrum deployed at: ", arbFake.address);
  deployments.save("Arbitrum", { abi: [], address: arbFake.address });
};

export default func;
func.tags = ["Faucet", "NewDeploy"];
