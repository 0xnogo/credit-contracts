import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { CreditPair } from "../../typechain";
import { DeploymentContext } from "./fixtures/Deploy";

export async function getBalanceState(
  context: DeploymentContext,
  maturity: BigNumber,
  signer: SignerWithAddress,
  isETHAsset = false,
  isETHCollateral = false
) {
  let assetToken = context.assetToken as Contract;
  let collateralToken = context.collateralToken as Contract;

  const weth = await ethers.getContractAt("WETH9", await context.router.weth());
  if (isETHAsset) {
    assetToken = weth;
  }
  if (isETHCollateral) {
    collateralToken = weth;
  }

  const pairContract = await getPairAddress(context, isETHAsset, isETHCollateral);

  if (!pairContract) {
    return {
      liquidity: BigNumber.from(0),
      asset: BigNumber.from(0),
      collateral: BigNumber.from(0),
      creditPositionManagerBalance: BigNumber.from(0),
      pairLiquidity: BigNumber.from(0),
    };
  }

  const asset = await assetToken.balanceOf(pairContract.address);
  const collateral = await collateralToken.balanceOf(pairContract.address);
  const creditPositionManagerBalance = await context.creditPositionManager.balanceOf(signer.address);
  const pairLiquidity = await pairContract.totalLiquidity(maturity);

  return {
    asset,
    collateral,
    creditPositionManagerBalance,
    pairLiquidity,
  };
}

export async function getRemoveBalanceState(
  context: DeploymentContext,
  maturity: BigNumber,
  signer: SignerWithAddress,
  creditPositionId: BigNumber,
  isETHAsset = false,
  isETHCollateral = false
) {
  let assetToken = context.assetToken as Contract;
  let collateralToken = context.collateralToken as Contract;
  let assetUser = null;
  let collateralUser = null;

  const weth = await ethers.getContractAt("WETH9", await context.router.weth());
  if (isETHAsset) {
    assetToken = weth;
    assetUser = await ethers.provider.getBalance(signer.address);
  }
  if (isETHCollateral) {
    collateralToken = weth;
    collateralUser = await ethers.provider.getBalance(signer.address);
  }

  const pairContract = await getPairAddress(context, isETHAsset, isETHCollateral);

  const liquidityCP = await context.creditPositionManager.getLiquidity(creditPositionId);
  assetUser = assetUser ? assetUser : await assetToken.balanceOf(signer.address);
  collateralUser = collateralUser ? collateralUser : await collateralToken.balanceOf(signer.address);
  const collateralPair = await collateralToken.balanceOf(pairContract.address);
  const assetPair = await assetToken.balanceOf(pairContract.address);
  const pairLiquidity = await pairContract.totalLiquidity(maturity);
  const assetReserve = (await pairContract.totalReserves(maturity)).asset;
  const collateralReserve = (await pairContract.totalReserves(maturity)).collateral;

  return {
    liquidityCP,
    collateralUser,
    assetUser,
    assetPair,
    collateralPair,
    pairLiquidity,
    assetReserve,
    collateralReserve,
  };
}

export async function getLendState(
  context: DeploymentContext,
  maturity: BigNumber,
  signer: SignerWithAddress,
  isETHAsset = false,
  isETHCollateral = false
) {
  let assetToken = context.assetToken as Contract;
  let collateralToken = context.collateralToken as Contract;
  let userAssetBalance = null;
  let assetPairBalance = null;

  const pairContract = await getPairAddress(context, isETHAsset, isETHCollateral);
  const weth = await ethers.getContractAt("WETH9", await context.router.weth());

  if (isETHAsset) {
    assetToken = weth;
    userAssetBalance = await ethers.provider.getBalance(signer.address);
    assetPairBalance = await assetToken.balanceOf(pairContract.address);
  }
  if (isETHCollateral) {
    collateralToken = weth;
  }

  userAssetBalance = userAssetBalance ? userAssetBalance : await assetToken.balanceOf(signer.address);
  assetPairBalance = assetPairBalance ? assetPairBalance : await assetToken.balanceOf(pairContract.address);

  const constantProduct = await pairContract.constantProduct(maturity);
  const assetReservePair = (await pairContract.totalReserves(maturity)).asset;
  const lpFeeStored = await pairContract.lpFeeStored(maturity);
  const protocolFeeStored = await pairContract.protocolFeeStored();
  const stakingFeeStored = await pairContract.stakingFeeStored();

  return {
    pairContract,
    userAssetBalance,
    assetPairBalance,
    constantProduct,
    assetReservePair,
    lpFeeStored,
    protocolFeeStored,
    stakingFeeStored,
  };
}

export async function getCollectState(
  context: DeploymentContext,
  maturity: BigNumber,
  signer: SignerWithAddress,
  isETHAsset = false,
  isETHCollateral = false
) {
  let assetToken = context.assetToken as Contract;
  let collateralToken = context.collateralToken as Contract;
  let userAssetBalance = null;
  let assetPairBalance = null;
  let userCollateralBalance = null;
  let collateralPairBalance = null;

  const pairContract = await getPairAddress(context, isETHAsset, isETHCollateral);
  const weth = await ethers.getContractAt("WETH9", await context.router.weth());

  if (isETHAsset) {
    assetToken = weth;
    userAssetBalance = await ethers.provider.getBalance(signer.address);
    assetPairBalance = await assetToken.balanceOf(pairContract.address);
  }
  if (isETHCollateral) {
    collateralToken = weth;
    userCollateralBalance = await ethers.provider.getBalance(signer.address);
    collateralPairBalance = await collateralToken.balanceOf(pairContract.address);
  }

  userAssetBalance = userAssetBalance ? userAssetBalance : await assetToken.balanceOf(signer.address);
  assetPairBalance = assetPairBalance ? assetPairBalance : await assetToken.balanceOf(pairContract.address);
  userCollateralBalance = userCollateralBalance
    ? userCollateralBalance
    : await collateralToken.balanceOf(signer.address);
  collateralPairBalance = collateralPairBalance
    ? collateralPairBalance
    : await collateralToken.balanceOf(pairContract.address);

  const totalClaims = await pairContract.totalClaims(maturity);
  const claimOfCP = await pairContract.claimsOf(maturity, context.creditPositionManager.address);

  return {
    pairContract,
    userAssetBalance,
    assetPairBalance,
    userCollateralBalance,
    collateralPairBalance,
    totalClaims,
    claimOfCP,
  };
}

export async function getBorrowState(
  context: DeploymentContext,
  maturity: BigNumber,
  signer: SignerWithAddress,
  isETHAsset = false,
  isETHCollateral = false
) {
  let assetToken = context.assetToken as Contract;
  let collateralToken = context.collateralToken as Contract;
  let userAssetBalance = null;
  let assetPairBalance = null;

  let userCollateralBalance = null;
  let collateralPairBalance = null;

  const pairContract = await getPairAddress(context, isETHAsset, isETHCollateral);
  const weth = await ethers.getContractAt("WETH9", await context.router.weth());

  if (isETHAsset) {
    assetToken = weth;
    userAssetBalance = await ethers.provider.getBalance(signer.address);
    assetPairBalance = await assetToken.balanceOf(pairContract.address);
  }
  if (isETHCollateral) {
    collateralToken = weth;
    userCollateralBalance = await ethers.provider.getBalance(signer.address);
    collateralPairBalance = await collateralToken.balanceOf(pairContract.address);
  }

  userAssetBalance = userAssetBalance ? userAssetBalance : await assetToken.balanceOf(signer.address);
  assetPairBalance = assetPairBalance ? assetPairBalance : await assetToken.balanceOf(pairContract.address);

  userCollateralBalance = userCollateralBalance
    ? userCollateralBalance
    : await collateralToken.balanceOf(signer.address);
  collateralPairBalance = collateralPairBalance
    ? collateralPairBalance
    : await collateralToken.balanceOf(pairContract.address);

  const constantProduct = await pairContract.constantProduct(maturity);
  const assetReservePair = (await pairContract.totalReserves(maturity)).asset;
  const collateralReservePair = (await pairContract.totalReserves(maturity)).collateral;
  const debtReservePair = await pairContract.totalDebtCreated(maturity);
  const lpFeeStored = await pairContract.lpFeeStored(maturity);
  const protocolFeeStored = await pairContract.protocolFeeStored();
  const stakingFeeStored = await pairContract.stakingFeeStored();

  return {
    pairContract,
    userAssetBalance,
    assetPairBalance,
    userCollateralBalance,
    collateralPairBalance,
    constantProduct,
    assetReservePair,
    debtReservePair,
    collateralReservePair,
    lpFeeStored,
    protocolFeeStored,
    stakingFeeStored,
  };
}

export async function getRepayState(
  context: DeploymentContext,
  maturity: BigNumber,
  signer: SignerWithAddress,
  isETHAsset = false,
  isETHCollateral = false
) {
  let assetToken = context.assetToken as Contract;
  let collateralToken = context.collateralToken as Contract;
  let userAssetBalance = null;
  let assetPairBalance = null;
  let userCollateralBalance = null;
  let collateralPairBalance = null;

  const pairContract = await getPairAddress(context, isETHAsset, isETHCollateral);
  const weth = await ethers.getContractAt("WETH9", await context.router.weth());

  if (isETHAsset) {
    assetToken = weth;
    userAssetBalance = await ethers.provider.getBalance(signer.address);
    assetPairBalance = await assetToken.balanceOf(pairContract.address);
  }
  if (isETHCollateral) {
    collateralToken = weth;
    userCollateralBalance = await ethers.provider.getBalance(signer.address);
    collateralPairBalance = await collateralToken.balanceOf(pairContract.address);
  }

  userAssetBalance = userAssetBalance ? userAssetBalance : await assetToken.balanceOf(signer.address);
  assetPairBalance = assetPairBalance ? assetPairBalance : await assetToken.balanceOf(pairContract.address);
  userCollateralBalance = userCollateralBalance
    ? userCollateralBalance
    : await collateralToken.balanceOf(signer.address);
  collateralPairBalance = collateralPairBalance
    ? collateralPairBalance
    : await collateralToken.balanceOf(pairContract.address);

  const claimOfCP = await pairContract.claimsOf(maturity, context.creditPositionManager.address);

  const assetReservePair = (await pairContract.totalReserves(maturity)).asset;
  const collateralReservePair = (await pairContract.totalReserves(maturity)).collateral;

  return {
    pairContract,
    userAssetBalance,
    assetPairBalance,
    userCollateralBalance,
    collateralPairBalance,
    assetReservePair,
    collateralReservePair,
    claimOfCP,
  };
}

export async function getPairAddress(
  context: DeploymentContext,
  isETHAsset: boolean = false,
  isETHCollateral: boolean = false
): Promise<CreditPair | null> {
  let assetToken = context.assetToken as Contract;
  let collateralToken = context.collateralToken as Contract;

  const weth = await ethers.getContractAt("WETH9", await context.router.weth());
  if (isETHAsset) {
    assetToken = weth;
  }
  if (isETHCollateral) {
    collateralToken = weth;
  }

  const factory = await ethers.getContractAt("CreditFactory", await context.router.factory());
  const address = await factory.getPair(assetToken.address, collateralToken.address);
  return address === ethers.constants.AddressZero
    ? null
    : ((await ethers.getContractAt("CreditPair", address)) as CreditPair);
}
