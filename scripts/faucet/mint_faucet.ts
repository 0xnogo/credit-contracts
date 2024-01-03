import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const mintFaucet: () => void = () => {
  task("mintFaucet", "CP a user is holding")
    .addParam("amount", "amound")
    .addParam("to", "To address")
    .addParam("token", "Token name: 'usdc' or 'arb' or 'eth'")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[0];
      console.log("Using the account:", caller.address);

      const faucetDeployment = await hardhatRuntime.deployments.get(`Faucet`);
      const faucet = await hardhatRuntime.ethers.getContractAt("Faucet", faucetDeployment.address);

      const usdcDeployment = await hardhatRuntime.deployments.get(`USDC`);
      const usdc = await hardhatRuntime.ethers.getContractAt("ERC20PresetMinterPauser", usdcDeployment.address);

      const arbDeployment = await hardhatRuntime.deployments.get(`Arbitrum`);
      const arb = await hardhatRuntime.ethers.getContractAt("ERC20PresetMinterPauser", arbDeployment.address);

      let token = "";
      let decimal = 18;
      if (taskArgs.token === "usdc") {
        token = usdc.address;
        decimal = await usdc.decimals();
      } else if (taskArgs.token === "arb") {
        token = arb.address;
        decimal = await arb.decimals();
      } else if (taskArgs.token === "eth") {
        token = hardhatRuntime.ethers.constants.AddressZero;
        decimal = 18;
      } else {
        throw new Error("Invalid token");
      }

      const amount = hardhatRuntime.ethers.utils.parseUnits(taskArgs.amount, decimal);

      await faucet.connect(caller).mintAdmin(token, amount, taskArgs.to);

      // const proof = [
      //   "0xa50af6d8eee8463085ea19d1e427a50bbf3d92f54f1185a745d7c9d3d4032017",
      //   "0x82a265653a9c365279b599b5b82f5d38b18578970e280e288991ec7ad2c289ee",
      // ];

      // await faucet.connect(caller).mint(proof, token);

      console.log("USDC balance: ", (await usdc.balanceOf(caller.address)).toString());
      console.log("Arbitrum balance: ", (await arb.balanceOf(caller.address)).toString());
    });
};
export { mintFaucet };
