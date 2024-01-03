import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const whitelistToken: () => void = () => {
  task("whitelistToken", "CP a user is holding")
    .addParam("token", "Token address to whitelist")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[0];
      console.log("Using the account:", caller.address);

      const faucetDeployment = await hardhatRuntime.deployments.get(`Faucet`);
      const faucet = await hardhatRuntime.ethers.getContractAt("Faucet", faucetDeployment.address);

      // add to whitelist
      await faucet.connect(caller).addToken(taskArgs.token);

      console.log("Whitelisted token:", taskArgs.token);
    });
};
export { whitelistToken };
