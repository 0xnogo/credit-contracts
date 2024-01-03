import UniswapV2Router from "@uniswap/v2-periphery/build/UniswapV2Router02.json";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, ethers } = hre;

  const dexFactoryAddress = (await deployments.get("DexFactory")).address;
  const wethAddress = (await deployments.get("WETH")).address;
  if (
    (await hre.getChainId()) === "42161" ||
    (await hre.getChainId()) === "421613" ||
    (await hre.getChainId()) === "31337" ||
    (await hre.getChainId()) === "3333"
  ) {
    const DexRouter = await ethers.getContractFactory(UniswapV2Router.abi, UniswapV2Router.bytecode);
    const dexRouter = await DexRouter.deploy(dexFactoryAddress, wethAddress);

    deployments.save("DexRouter", { abi: UniswapV2Router.abi, address: dexRouter.address });
  }
};

export default func;
func.dependencies = ["DexFactory"];
func.tags = ["DexRouter", "Goerli", "NewDeploy", "Uniswap"];
