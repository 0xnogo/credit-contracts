import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";
import { boolean } from "hardhat/internal/core/params/argumentTypes";

const performSwap: () => void = () => {
  task("swap-for-eth", "Create Swap LP with eth as one of the tokens")
    .addParam("token", "The token address, either usdc or arb")
    .addParam("amountin", "The min eth amount")
    .addOptionalParam("tokenToEth", "swapExactTokensForETH or swapExactTokensForETH", true, boolean)
    .setAction(async (taskArgs, hardhatRuntime) => {
      const [caller] = await hardhatRuntime.ethers.getSigners();
      console.log("Using the account:", caller.address);
      const DexRouter = await hardhatRuntime.deployments.get("DexRouter");
      const dexRouter = await hardhatRuntime.ethers.getContractAt(DexRouter.abi, DexRouter.address);

      const usdcDeployment = await hardhatRuntime.deployments.get(`USDC`);
      const usdc = await hardhatRuntime.ethers.getContractAt("ERC20PresetMinterPauser", usdcDeployment.address);

      const arbDeployment = await hardhatRuntime.deployments.get(`Arbitrum`);
      const arb = await hardhatRuntime.ethers.getContractAt("ERC20PresetMinterPauser", arbDeployment.address);

      const wethDeployment = await hardhatRuntime.deployments.get(`WETH`);
      const token = taskArgs.token === "usdc" ? usdc : arb;
      await token.connect(caller).approve(dexRouter.address, hardhatRuntime.ethers.constants.MaxUint256);

      const currentBlock = await hardhatRuntime.ethers.provider.getBlock("latest");
      let tx;
      if (taskArgs.tokenToEth) {
        tx = await dexRouter
          .connect(caller)
          .swapExactTokensForETH(
            taskArgs.amountin,
            0,
            [token.address, wethDeployment.address],
            caller.address,
            currentBlock.timestamp + 1000
          );
      } else {
        tx = await dexRouter
          .connect(caller)
          .swapExactEthForTokens(
            0,
            [wethDeployment.address, token.address],
            caller.address,
            currentBlock.timestamp + 1000,
            { value: taskArgs.amountin }
          );
      }

      await tx.wait();

      console.log(`Swap completed`);
    });
};
export { performSwap };
