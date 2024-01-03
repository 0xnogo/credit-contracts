import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  let wethAddress: string;
  if ((await hre.getChainId()) === "3333") {
    // TODO: add Meliora prod (probably have to deploy a WETH contract on Meliora)
    // Meliora testnet case
    const weth = await deploy("WETH9", {
      from: deployer,
      log: true,
    });

    wethAddress = weth.address;
    console.log("Weth contract deployed for hardhat: ", wethAddress);
  } else if (
    (await hre.getChainId()) === "42161" || // Arbitrum mainnet
    (await hre.getChainId()) === "31337"
  ) {
    // Arbitrum mainnet case and forked mainnet case
    wethAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
  } else if ((await hre.getChainId()) === "421613") {
    // Arbitrum Goerli case
    wethAddress = "0xEe01c0CD76354C383B8c7B4e65EA88D00B06f36f";
  } else {
    throw new Error("Unknown network");
  }

  deployments.save("WETH", { abi: [], address: wethAddress });
};

export default func;
func.tags = ["WETH", "NewDeploy"];
