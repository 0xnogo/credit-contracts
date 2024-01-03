import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const poolReserve: () => void = () => {
  task("poolReserve", "Get the pool reserve")
    .addParam("pairAddress", "Address of the pair")
    .addParam("maturity", "Maturity of the pool")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[0];
      console.log("Using the account:", caller.address);

      const pair = await hardhatRuntime.ethers.getContractAt("CreditPair", taskArgs.pairAddress);
      const reserve = await pair.totalReserves(taskArgs.maturity);

      console.log("Reserve:", reserve.toString());
    });
};
export { poolReserve };
