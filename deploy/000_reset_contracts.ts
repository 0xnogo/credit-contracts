import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;

  let wethAddress = "0xEe01c0CD76354C383B8c7B4e65EA88D00B06f36f";
  let faucetAddress = "0x68694Fb9318c336d2Fa8155A27C022055bf017b7";
  let usdcAddress = "0xCD271697983Ca096E18DBed0D95e64BDFceb1Bfc";
  let arbAddress = "0xeDAd8F039b630c9F7b3C436B741a1327614BeaD1";

  deployments.save("WETH", { abi: [], address: wethAddress });
  deployments.save("Faucet", { abi: [], address: faucetAddress });
  deployments.save("USDC", { abi: [], address: usdcAddress });
  deployments.save("Arbitrum", { abi: [], address: arbAddress });
};

export default func;
func.tags = ["Setup"];
