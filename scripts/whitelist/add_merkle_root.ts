import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const addMerkleRoot: () => void = () => {
  task("addMerkleRoot", "Add merkle root hash")
    .addParam("merkleRootHash", "Merkle root hash")
    .addParam("epoch", "Epoch index")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const caller = (await hardhatRuntime.ethers.getSigners())[0];
      console.log("Using the account:", caller.address);

      const faucetAddress = (await hardhatRuntime.deployments.get(`Faucet`)).address;
      const routerAddress = (await hardhatRuntime.deployments.get("Router")).address;
      const usdcAddress = (await hardhatRuntime.deployments.get("USDC")).address;
      const arbAddress = (await hardhatRuntime.deployments.get("Arbitrum")).address;

      const faucet = await hardhatRuntime.ethers.getContractAt("Faucet", faucetAddress);
      const router = await hardhatRuntime.ethers.getContractAt("CreditRouter", routerAddress);

      await faucet.initNextEpoch(
        [usdcAddress, arbAddress, hardhatRuntime.ethers.constants.AddressZero],
        taskArgs.merkleRootHash,
        hardhatRuntime.ethers.utils.parseEther("2"),
        hardhatRuntime.ethers.utils.parseEther("1000")
      );
      await router.setMerkleRoot(taskArgs.merkleRootHash);

      console.log("Curent epoch in the faucet: ", await faucet.currentEpoch());
    });
};
export { addMerkleRoot };
