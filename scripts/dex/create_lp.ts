import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";
import UniswapV2Factory from "@uniswap/v2-core/build/UniswapV2Factory.json";

const createLiqPool: () => void = () => {
  task("create-swap-lp-eth", "Create Swap LP with eth as one of the tokens")
    .addParam("token", "The name of the token, either usdc or arb")
    .addParam("amountmin", "The min token amt")
    .addParam("amountethmin", "The min eth amount")
    .addParam("swappoolid","Swap pool id")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const [caller] = await hardhatRuntime.ethers.getSigners();
      console.log("Using the account:", caller.address);

      const DexRouter = await hardhatRuntime.deployments.get("DexRouter");
      const dexRouter = await hardhatRuntime.ethers.getContractAt(DexRouter.abi, DexRouter.address);


      const usdcDeployment = await hardhatRuntime.deployments.get(`USDC`);
      const usdc = await hardhatRuntime.ethers.getContractAt("ERC20PresetMinterPauser", usdcDeployment.address);

      const arbDeployment = await hardhatRuntime.deployments.get(`Arbitrum`);
      const arb = await hardhatRuntime.ethers.getContractAt("ERC20PresetMinterPauser", arbDeployment.address);

      const token = taskArgs.token === 'usdc'?usdc:arb

      await token.connect(caller).approve(dexRouter.address, hardhatRuntime.ethers.constants.MaxUint256);
      console.log('Approved Token')
      const currentBlock = await hardhatRuntime.ethers.provider.getBlock("latest");
      console.log(token.address, taskArgs.amountmin, 0, 0, caller.address, currentBlock.timestamp + 1000, {
        value: taskArgs.amountethmin,
      })
      const tx = await dexRouter
        .connect(caller)
        .addLiquidityETH(token.address, taskArgs.amountmin, 0, 0, caller.address, currentBlock.timestamp + 1000, {
          value: taskArgs.amountethmin,
        });

       await tx.wait();
      const DexFactory = await hardhatRuntime.deployments.get("DexFactory");
      const dexFactory = await hardhatRuntime.ethers.getContractAt(DexFactory.abi, DexFactory.address);
      // get CreditPairFactory abi
      const allPairsLength = await dexFactory.allPairsLength();
      const pairAddress = await dexFactory.allPairs(allPairsLength.toNumber() - 1)

      hardhatRuntime.deployments.save(`SwapPair${taskArgs.swappoolid}`, { abi: [], address: pairAddress });
      console.log(`Liquidity pool created`);
    });
};
export { createLiqPool };
