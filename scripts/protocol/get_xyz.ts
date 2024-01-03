import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const getXYZ: () => void = () => {
  task("getXYZ", "Get staking and protocol fee")
    .addParam("poolId", "Pool id")
    .addParam("maturity", "Maturity")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[0];
      console.log("Using the account:", caller.address);

      const creditPairDeployment = await hardhatRuntime.deployments.get(`CreditPair${taskArgs.poolId}`);
      const creditPair = await hardhatRuntime.ethers.getContractAt("CreditPair", creditPairDeployment.address);

      const constantProduct = await creditPair.constantProduct(taskArgs.maturity);

      console.log("X:", constantProduct[0].toString());
      console.log("Y:", constantProduct[1].toString());
      console.log("Z:", constantProduct[2].toString());
    });
};
export { getXYZ };
