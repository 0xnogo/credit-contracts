import UniswapV2Factory from "@uniswap/v2-core/build/UniswapV2Factory.json";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deployer } = await getNamedAccounts();

  if (
    (await hre.getChainId()) === "42161" ||
    (await hre.getChainId()) === "421613" ||
    (await hre.getChainId()) === "31337" ||
    (await hre.getChainId()) === "3333"
  ) {
    const DexFactory = await ethers.getContractFactory(UniswapV2Factory.abi, UniswapV2Factory.bytecode);
    const dexFactory = await DexFactory.deploy(deployer);

    deployments.save("DexFactory", { abi: UniswapV2Factory.abi, address: dexFactory.address });
  }
};

export default func;
func.tags = ["DexFactory", "Goerli", "NewDeploy", "Uniswap"];
