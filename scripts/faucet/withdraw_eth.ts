import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const withdrawEth: () => void = () => {
  task("withdrawEth", "CP a user is holding")
    .addParam("amount", "Amount of ETH to withdraw")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[0];
      console.log("Using the account:", caller.address);

      const faucetDeployment = await hardhatRuntime.deployments.get(`Faucet`);
      const faucet = await hardhatRuntime.ethers.getContractAt("Faucet", faucetDeployment.address);

      // send the faucet to the caller
      await faucet
        .connect(caller)
        .withdraw(
          hardhatRuntime.ethers.constants.AddressZero,
          hardhatRuntime.ethers.utils.parseEther(taskArgs.amount),
          caller.address
        );

      console.log("Withdrawn ETH:", taskArgs.amount);
    });
};
export { withdrawEth };
