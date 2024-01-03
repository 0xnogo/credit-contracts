import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task, types } from "hardhat/config";

// needs to be called by the actual owner
const transferOwnership: () => void = () => {
  task("transferOwnership", "Transfer ownership to a new address")
    .addParam("newOwner", "New owner address")
    .addOptionalParam("userId", "User id to use", 0, types.int)
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[taskArgs.userId];
      console.log("Using the account:", caller.address);

      // Router, Factory, CreditPosition, CreditToken, Staking... (add more if needed)
      const CreditRouterDeployment = await hardhatRuntime.deployments.get("Router");
      const router = await hardhatRuntime.ethers.getContractAt("CreditRouter", CreditRouterDeployment.address);

      const CreditPositionDeployment = await hardhatRuntime.deployments.get("CreditPosition");
      const creditPosition = await hardhatRuntime.ethers.getContractAt(
        "CreditPosition",
        CreditPositionDeployment.address
      );

      const CreditFactoryDeployment = await hardhatRuntime.deployments.get("CreditFactory");
      const creditFactory = await hardhatRuntime.ethers.getContractAt("CreditFactory", CreditFactoryDeployment.address);

      const usdcDeployment = await hardhatRuntime.deployments.get(`USDC`);
      const usdc = await hardhatRuntime.ethers.getContractAt("ERC20PresetMinterPauser", usdcDeployment.address);

      const arbDeployment = await hardhatRuntime.deployments.get(`Arbitrum`);
      const arb = await hardhatRuntime.ethers.getContractAt("ERC20PresetMinterPauser", arbDeployment.address);

      const newOwner = taskArgs.newOwner;

      const defaultAdminRole = await usdc.DEFAULT_ADMIN_ROLE();

      // transfer ownership
      await router.connect(caller).transferOwnership(newOwner);
      await creditPosition.connect(caller).transferOwnership(newOwner);
      await creditFactory.connect(caller).transferOwnership(newOwner);
      await usdc.connect(caller).grantRole(defaultAdminRole, newOwner);
      await arb.connect(caller).grantRole(defaultAdminRole, newOwner);

      console.log(`Ownership transfered to ${taskArgs.newOwner}`);
    });
};
export { transferOwnership };
