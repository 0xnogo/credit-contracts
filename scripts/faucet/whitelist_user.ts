import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const whitelistUser: () => void = () => {
  task("whitelistUser", "CP a user is holding")
    .addParam("user", "User address to whitelist")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[0];
      console.log("Using the account:", caller.address);

      const faucetDeployment = await hardhatRuntime.deployments.get(`Faucet`);
      const faucet = await hardhatRuntime.ethers.getContractAt("Faucet", faucetDeployment.address);

      // add to whitelist
      await faucet.connect(caller).addWhitelist(taskArgs.user);

      console.log("Whitelisted user:", taskArgs.user);
    });
};
export { whitelistUser };
