import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const addMinter: () => void = () => {
  task("addMinter", "CP a user is holding")
    .addParam("minter", "Minter address")
    .addParam("token", "Token address")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[0];
      console.log("Using the account:", caller.address);

      const token = await hardhatRuntime.ethers.getContractAt("ERC20PresetMinterPauser", taskArgs.token);
      const minterRole = await token.MINTER_ROLE();
      await token.grantRole(minterRole, taskArgs.minter);

      console.log("Added minter role to:", taskArgs.minter);
    });
};
export { addMinter };
