import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// This will deploy a faucet with existing ERC20 contracts
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const faucet = await deploy("Faucet", {
    from: deployer,
    log: true,
  });

  const faucetContract = await hre.ethers.getContractAt("Faucet", faucet.address);

  // grant minter role to faucet
  const usdcFakeContract = await hre.ethers.getContractAt(
    "ERC20PresetMinterPauser",
    "0x96244E2ae03B8edA8c1035F75948667777D3ac52"
  );
  const minterRole = await usdcFakeContract.MINTER_ROLE();
  await usdcFakeContract.grantRole(minterRole, faucet.address);

  const arbFakeContract = await hre.ethers.getContractAt(
    "ERC20PresetMinterPauser",
    "0x2C085310719Bf846A135ff80c059aaBc96320A49"
  );
  await arbFakeContract.grantRole(minterRole, faucet.address);

  // send 68 eth to faucet
  const signer = (await hre.ethers.getSigners())[0];
  await signer.sendTransaction({
    to: faucet.address,
    value: hre.ethers.utils.parseEther("66"),
  });
};

export default func;
func.tags = ["ReuseFaucet"];
