import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployMockContract, MockContract } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { CreditPositionManager, CreditToken, IDistributor__factory, LPFarming, WETH9 } from "../../../../typechain";
import { ICreditPositionManager } from "../../../../typechain/ICreditPositionManager";
import { min, now } from "../../helper";
import { deployCreditPosition, initCreditPosition } from "../../shared/DeployCreditPosition";

export interface LPFarmingContext {
  lpFarming: LPFarming;
  creditToken: CreditToken;
  creditPosition: CreditPositionManager;
  distributionMock: MockContract;
  weth: WETH9;
}

export const deploy = async (routerAddress: string): Promise<LPFarmingContext> => {
  const CreditToken = await ethers.getContractFactory("CreditToken");
  const creditToken = (await CreditToken.deploy()) as CreditToken;
  await creditToken.initialize("Credit", "CREDIT");
  await creditToken.mint((await ethers.getSigners())[0].address, ethers.utils.parseEther("450000"));

  const creditPosition = await deployCreditPosition();
  await initCreditPosition(creditPosition, routerAddress);

  const WETH = await ethers.getContractFactory("WETH9");
  const weth = (await WETH.deploy()) as WETH9;

  const LPFarming = await ethers.getContractFactory("LPFarming");
  const lpFarming = (await LPFarming.deploy()) as LPFarming;

  const distributionMock = await deployMockContract((await ethers.getSigners())[0], IDistributor__factory.abi);

  await lpFarming.initialize(creditToken.address);

  await lpFarming.setDistributor(distributionMock.address);
  await lpFarming.setCreditPosition(creditPosition.address);

  return {
    lpFarming,
    creditToken,
    creditPosition,
    distributionMock,
    weth,
  };
};

export const createCP = async (
  context: LPFarmingContext,
  pair: string,
  user: SignerWithAddress,
  to: SignerWithAddress,
  maturity: BigNumber,
  totalAmount: BigNumber
) => {
  await context.weth.connect(user).deposit({ value: totalAmount });
  await context.weth.connect(user).approve(context.creditPosition.address, totalAmount);

  const mintParams: ICreditPositionManager.MintParamsStruct = {
    pair: context.weth.address,
    maturity: maturity,
    positionType: 0,
    amounts: [totalAmount],
    recipient: to.address,
  };

  await context.creditPosition.connect(user).mint(mintParams);
};

export const computePoolHash = async (pair: string, maturity: BigNumber) => {
  const poolHash = ethers.utils.solidityKeccak256(["address", "uint256"], [pair, maturity]);
  return poolHash;
};

export const getCreditReward = async (context: LPFarmingContext, poolHash: string) => {
  const poolInfo = await context.lpFarming.poolInfo(poolHash);
  const emissionRate = await context.lpFarming.emissionRate();
  const totalAllocPoint = await context.lpFarming.totalAllocPoint();

  const start = min(await now(), poolInfo.maturity);
  const diff = start.sub(poolInfo.lastRewardTime);

  return diff.mul(emissionRate).mul(poolInfo.allocPoint).div(totalAllocPoint);
};

export const accCreditPerShare = async (context: LPFarmingContext, poolInfo: any, creditReward: BigNumber) => {
  const lpSupply = poolInfo.lpSupply;
  const accIncrement = creditReward.mul(BigNumber.from(1e12)).div(lpSupply);

  return poolInfo.accCreditPerShare.add(accIncrement);
};
