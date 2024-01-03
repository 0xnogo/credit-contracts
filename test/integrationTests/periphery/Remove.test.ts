import chai from "chai";
import { BigNumber, Contract, ContractReceipt } from "ethers";
import { ethers, waffle } from "hardhat";
import { DeploymentContext, createDeploymentContextFixture } from "../../utils/fixtures/Deploy";
import { newLiquidity, newLiquidityETHAsset, newLiquidityETHCollateral } from "../../utils/fixtures/Liquidity";
import { removeLiquidity, removeLiquidityETHAsset, removeLiquidityETHCollateral } from "../../utils/fixtures/Remove";
import { advanceTime, getEvent, now } from "../../utils/helper";
import { getPairAddress, getRemoveBalanceState } from "../../utils/state";

const { solidity, loadFixture } = waffle;
chai.use(solidity);
const { expect } = chai;

const newLiquidityParams = {
  assetIn: ethers.utils.parseEther("9999"),
  debtIn: ethers.utils.parseEther("12000"),
  collateralIn: ethers.utils.parseEther("1000"),
};
let removeLiquidityParams;
let signers = [];

async function fixture(): Promise<DeploymentContext> {
  signers = await ethers.getSigners();
  return await createDeploymentContextFixture(signers[0], signers[9].address);
}

describe("integration tests", () => {
  let maturity: BigNumber;
  before(async () => {
    maturity = (await now()).add(BigNumber.from(315360000));
  });

  describe("remove", () => {
    it("given liquidity when remove then credit position burnt and liquidity pulled", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await newLiquidity(context, maturity, newLiquidityParams, signers[0]);
      const beforeBalanceState = await getRemoveBalanceState(context, maturity, signers[0], BigNumber.from(0));

      removeLiquidityParams = {
        assetTo: signers[0].address,
        collateralTo: signers[0].address,
        creditPositionId: BigNumber.from(0),
      };

      // WHEN
      advanceTime(maturity);
      await context.creditPositionManager.approve(context.router.address, 0);
      const receipt = await removeLiquidity(context, maturity, removeLiquidityParams);

      // THEN
      await assertRemoveLiquidity(context, maturity, receipt, beforeBalanceState, BigNumber.from(0));
    });

    it("given iquidity when removeLiquidityETHAsset then credit position burnt and liquidity pulled", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await newLiquidityETHAsset(context, maturity, newLiquidityParams, signers[0]);
      const beforeBalanceState = await getRemoveBalanceState(context, maturity, signers[0], BigNumber.from(0), true);

      removeLiquidityParams = {
        assetTo: signers[0].address,
        collateralTo: signers[0].address,
        creditPositionId: BigNumber.from(0),
      };

      // WHEN
      advanceTime(maturity);
      await context.creditPositionManager.approve(context.router.address, 0);
      const receipt = await removeLiquidityETHAsset(context, maturity, removeLiquidityParams);

      // THEN
      await assertRemoveLiquidity(context, maturity, receipt, beforeBalanceState, BigNumber.from(0), true);
    });

    it("given iquidity when removeLiquidityETHCollateral then credit position burnt and liquidity pulled", async () => {
      // GIVEN
      const context = await loadFixture(fixture);
      await newLiquidityETHCollateral(context, maturity, newLiquidityParams, signers[0]);
      const beforeBalanceState = await getRemoveBalanceState(
        context,
        maturity,
        signers[0],
        BigNumber.from(0),
        false,
        true
      );

      removeLiquidityParams = {
        assetTo: signers[0].address,
        collateralTo: signers[0].address,
        creditPositionId: BigNumber.from(0),
      };

      // WHEN
      advanceTime(maturity);
      await context.creditPositionManager.approve(context.router.address, 0);
      const receipt = await removeLiquidityETHCollateral(context, maturity, removeLiquidityParams);

      // THEN
      await assertRemoveLiquidity(context, maturity, receipt, beforeBalanceState, BigNumber.from(0), false, true);
    });
  });
});

async function assertRemoveLiquidity(
  context: DeploymentContext,
  maturity: BigNumber,
  receipt: ContractReceipt,
  beforeState: any,
  creditPositionId: BigNumber,
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
  const currentState = await getRemoveBalanceState(
    context,
    maturity,
    signers[0],
    BigNumber.from(0),
    isETHAsset,
    isETHCollateral
  );

  // check fee?
  const pairInterface = pairContract.interface;
  const mintEvent = getEvent(pairInterface, receipt, "Burn");
  const liquidityIn = mintEvent[0].args["liquidityIn"];
  const assetOut = mintEvent[0].args["assetOut"];
  const collateralOut = mintEvent[0].args["collateralOut"];

  // check CP removed
  const liquidityCP = await context.creditPositionManager.getPositions(creditPositionId);

  expect(await context.creditPositionManager.nextTokenIdToMint()).to.be.eq(1);
  expect(await context.creditPositionManager.getPositionType(creditPositionId)).to.be.eq(0);
  expect(await context.creditPositionManager.getPair(creditPositionId)).to.be.eq(ethers.constants.AddressZero);
  expect(await context.creditPositionManager.getMaturity(creditPositionId)).to.be.eq(0);
  expect(liquidityCP[0]).to.be.eq(ethers.constants.AddressZero);
  expect(liquidityCP[1]).to.be.eq(0);
  expect(liquidityCP[2]).to.be.eq(0);
  expect(liquidityCP[3]).to.be.eq(0);
  expect(liquidityCP[4]).to.be.eq(0);
  expect(liquidityCP[5]).to.be.eq(0);
  expect(liquidityCP[6]).to.be.eq(0);

  await expect(context.creditPositionManager.ownerOf(creditPositionId)).to.be.reverted;
  await expect(
    removeLiquidity(context, maturity, {
      assetTo: signers[0].address,
      collateralTo: signers[0].address,
      creditPositionId: BigNumber.from(0),
    })
  ).to.be.reverted;

  // balances
  expect(beforeState.liquidityCP).to.be.eq(liquidityIn);
  expect(currentState.assetUser.sub(beforeState.assetUser)).to.be.closeTo(assetOut, ethers.utils.parseEther("0.001"));
  expect(currentState.collateralUser.sub(beforeState.collateralUser)).to.be.closeTo(
    collateralOut,
    ethers.utils.parseEther("0.001")
  );
  expect(beforeState.assetPair.sub(currentState.assetPair)).to.be.eq(assetOut);
  expect(beforeState.collateralPair.sub(currentState.collateralPair)).to.be.eq(collateralOut);

  // pair
  expect(currentState.pairLiquidity).to.be.eq(beforeState.pairLiquidity.sub(beforeState.liquidityCP));
  expect(await pairContract.lpFeeStored(maturity)).to.be.eq(0);

  expect(beforeState.assetReserve.sub(currentState.assetReserve)).to.be.eq(assetOut);
  expect(beforeState.collateralReserve.sub(currentState.collateralReserve)).to.be.eq(collateralOut);
}
