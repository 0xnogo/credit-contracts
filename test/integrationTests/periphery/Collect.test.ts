import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { BigNumber, ContractReceipt } from "ethers";
import { ethers, waffle } from "hardhat";
import { collect, collectETHAsset, collectETHCollateral } from "../../utils/fixtures/Collect";
import { DeploymentContext, createDeploymentContextFixture } from "../../utils/fixtures/Deploy";
import { lendGivenPercent, lendGivenPercentETHAsset, lendGivenPercentETHCollateral } from "../../utils/fixtures/Lend";
import { newLiquidity, newLiquidityETHAsset, newLiquidityETHCollateral } from "../../utils/fixtures/Liquidity";
import { advanceTime, getEvent, now } from "../../utils/helper";
import { getCollectState } from "../../utils/state";

const { solidity, loadFixture } = waffle;
chai.use(solidity);
const { expect } = chai;

const newLiquidityParams = {
  assetIn: ethers.utils.parseEther("10000"),
  debtIn: ethers.utils.parseEther("12000"),
  collateralIn: ethers.utils.parseEther("1000"),
};

const lendGivenPercentParams = {
  assetIn: ethers.utils.parseEther("1000"),
  minLoan: ethers.utils.parseEther("1010"),
  minCoverage: ethers.utils.parseEther("30"),
  percent: BigNumber.from(1).shl(31),
};

const collectParams = {
  creditPositionId: BigNumber.from(1),
};

let signers = [];

async function fixture(): Promise<DeploymentContext> {
  return await createDeploymentContextFixture(signers[0], signers[9].address);
}

describe("integration tests", () => {
  let maturity: BigNumber;
  before(async () => {
    signers = await ethers.getSigners();
    maturity = (await now()).add(BigNumber.from(315360000));
    await signers[1].sendTransaction({
      to: ethers.Wallet.createRandom().address,
      value: ethers.utils.parseEther("10000000000"),
    });
  });

  describe("collect", () => {
    it("given Collect when collect then credit position is burnt and principal+interest claimed", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await context.assetToken.mint(signers[1].address, lendGivenPercentParams.assetIn);
      await context.collateralToken.mint(signers[1].address, lendGivenPercentParams.minLoan);
      await context.assetToken.connect(signers[1]).approve(context.router.address, lendGivenPercentParams.assetIn);
      await context.collateralToken.connect(signers[1]).approve(context.router.address, lendGivenPercentParams.minLoan);
      await newLiquidity(context, maturity, newLiquidityParams, signers[0]);
      await lendGivenPercent(context, maturity, lendGivenPercentParams, signers[1]);
      const beforeState = await getCollectState(context, maturity, signers[1]);

      // WHEN
      advanceTime(maturity);
      await context.creditPositionManager.connect(signers[1]).approve(context.router.address, 1);
      const receipt = await collect(context, maturity, collectParams, signers[1]);

      // THEN
      await assertCollect(context, maturity, receipt, beforeState, BigNumber.from(1), signers[1]);
    });

    it("given CP already claim when claiming again it is failing", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await context.assetToken.mint(signers[1].address, lendGivenPercentParams.assetIn);
      await context.collateralToken.mint(signers[1].address, lendGivenPercentParams.minLoan);
      await context.assetToken.connect(signers[1]).approve(context.router.address, lendGivenPercentParams.assetIn);
      await context.collateralToken.connect(signers[1]).approve(context.router.address, lendGivenPercentParams.minLoan);
      await newLiquidity(context, maturity, newLiquidityParams, signers[0]);
      await lendGivenPercent(context, maturity, lendGivenPercentParams, signers[1]);

      // WHEN
      advanceTime(maturity);
      await context.creditPositionManager.connect(signers[1]).approve(context.router.address, 1);
      await collect(context, maturity, collectParams, signers[1]);

      // THEN
      expect(collect(context, maturity, collectParams, signers[1])).to.be.revertedWith("ERC721: invalid token ID");
    });

    it("given CP approved to router when another call collect then failing", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await context.assetToken.mint(signers[1].address, lendGivenPercentParams.assetIn);
      await context.collateralToken.mint(signers[1].address, lendGivenPercentParams.minLoan);
      await context.assetToken.connect(signers[1]).approve(context.router.address, lendGivenPercentParams.assetIn);
      await context.collateralToken.connect(signers[1]).approve(context.router.address, lendGivenPercentParams.minLoan);
      await newLiquidity(context, maturity, newLiquidityParams, signers[0]);
      await lendGivenPercent(context, maturity, lendGivenPercentParams, signers[1]);

      // WHEN
      advanceTime(maturity);
      await context.creditPositionManager.connect(signers[1]).approve(context.router.address, 1);

      // THEN
      expect(collect(context, maturity, collectParams, signers[2])).to.be.revertedWith("E603");
    });

    it("given CollectETHAsset when collectETHAsset then credit position is minted", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await context.collateralToken.mint(signers[1].address, lendGivenPercentParams.minLoan);
      await context.collateralToken.connect(signers[1]).approve(context.router.address, lendGivenPercentParams.minLoan);
      await newLiquidityETHAsset(context, maturity, newLiquidityParams, signers[0]);
      await lendGivenPercentETHAsset(context, maturity, lendGivenPercentParams, signers[1]);
      const beforeState = await getCollectState(context, maturity, signers[1], true);

      // WHEN
      advanceTime(maturity);
      await context.creditPositionManager.connect(signers[1]).approve(context.router.address, 1);
      const receipt = await collectETHAsset(context, maturity, collectParams, signers[1]);

      // THEN
      await assertCollect(context, maturity, receipt, beforeState, BigNumber.from(1), signers[1], true);
    });

    it("given CollectETHCollateral when collectETHCollateral then credit position is minted", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await context.assetToken.mint(signers[1].address, lendGivenPercentParams.assetIn);
      await context.assetToken.connect(signers[1]).approve(context.router.address, lendGivenPercentParams.assetIn);
      await newLiquidityETHCollateral(context, maturity, newLiquidityParams, signers[0]);
      await lendGivenPercentETHCollateral(context, maturity, lendGivenPercentParams, signers[1]);
      const beforeState = await getCollectState(context, maturity, signers[1], false, true);

      // WHEN
      advanceTime(maturity);
      await context.creditPositionManager.connect(signers[1]).approve(context.router.address, 1);
      const receipt = await collectETHCollateral(context, maturity, collectParams, signers[1]);

      // THEN
      await assertCollect(context, maturity, receipt, beforeState, BigNumber.from(1), signers[1], false, true);
    });
  });
});

async function assertCollect(
  context: DeploymentContext,
  maturity: BigNumber,
  receipt: ContractReceipt,
  beforeState: any,
  creditPositionId: BigNumber,
  receiver: SignerWithAddress,
  isETHAsset = false,
  isETHCollateral = false
) {
  const currentState = await getCollectState(context, maturity, receiver, isETHAsset, isETHCollateral);
  const creditCP = await context.creditPositionManager.getPositions(creditPositionId);

  const withdrawEvent = getEvent(currentState.pairContract.interface, receipt, "Withdraw");
  const tokensOut = withdrawEvent[0].args["tokensOut"];
  const assetOut = tokensOut[0];
  const collateralOut = tokensOut[1];
  const claimsIn = withdrawEvent[0].args["claimsIn"];
  const loanPrincipalClaimedIn = claimsIn[0];
  const loanInterestClaimedIn = claimsIn[1];
  const coveragePrincipalClaimedIn = claimsIn[2];
  const coverageInterestClaimedIn = claimsIn[3];

  // balance
  expect(beforeState.assetPairBalance.sub(currentState.assetPairBalance)).to.be.equal(assetOut);
  expect(beforeState.collateralPairBalance.sub(currentState.collateralPairBalance)).to.be.equal(collateralOut);

  expect(currentState.userAssetBalance.sub(beforeState.userAssetBalance)).to.be.closeTo(
    assetOut,
    ethers.utils.parseEther("0.001")
  );
  expect(currentState.userCollateralBalance.sub(beforeState.userCollateralBalance)).to.be.closeTo(
    collateralOut,
    ethers.utils.parseEther("0.001")
  );

  // credit position
  expect(await context.creditPositionManager.nextTokenIdToMint()).to.be.eq(2);
  expect(await context.creditPositionManager.getPositionType(creditPositionId)).to.be.eq(0);
  expect(await context.creditPositionManager.getPair(creditPositionId)).to.be.eq(ethers.constants.AddressZero);
  expect(await context.creditPositionManager.getMaturity(creditPositionId)).to.be.eq(0);
  expect(creditCP[0]).to.be.eq(ethers.constants.AddressZero);
  expect(creditCP[1]).to.be.eq(0);
  expect(creditCP[2]).to.be.eq(0);
  expect(creditCP[3]).to.be.eq(0);
  expect(creditCP[4]).to.be.eq(0);
  expect(creditCP[5]).to.be.eq(0);
  expect(creditCP[6]).to.be.eq(0);
  await expect(context.creditPositionManager.ownerOf(creditPositionId)).to.be.reverted;
  await expect(collect(context, maturity, collectParams, signers[1])).to.be.reverted;

  // pair
  expect(beforeState.totalClaims["loanPrincipal"].sub(currentState.totalClaims["loanPrincipal"])).to.be.equal(
    loanPrincipalClaimedIn
  );
  expect(beforeState.totalClaims["loanInterest"].sub(currentState.totalClaims["loanInterest"])).to.be.equal(
    loanInterestClaimedIn
  );
  expect(beforeState.totalClaims["coveragePrincipal"].sub(currentState.totalClaims["coveragePrincipal"])).to.be.equal(
    coveragePrincipalClaimedIn
  );
  expect(beforeState.totalClaims["coverageInterest"].sub(currentState.totalClaims["coverageInterest"])).to.be.equal(
    coverageInterestClaimedIn
  );
}
