import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const whitelistUsers: () => void = () => {
  task("whitelistUsers", "CP a user is holding")
    .addVariadicPositionalParam("users")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[0];
      console.log("Using the account:", caller.address);

      const faucetDeployment = await hardhatRuntime.deployments.get(`Faucet`);
      const faucet = await hardhatRuntime.ethers.getContractAt("Faucet", faucetDeployment.address);
      // add to whitelist
      await faucet.connect(caller).addMultipleWhitelist(taskArgs.users);

      console.log("Whitelisted user:", taskArgs.users);
    });
};
export { whitelistUsers };
