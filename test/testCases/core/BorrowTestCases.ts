import { BigNumber } from "@ethersproject/bignumber";
import { divUp } from "../../utils/librariesCore/Math";
import { pseudoRandomBigUint } from "../../utils/shared/Helper";
import { ConstantProduct, Tokens } from "../../utils/shared/PairInterface";

export interface BorrowParams {
  assetOut: bigint;
  collateralIn: bigint;
  interestIncrease: bigint;
  cdpIncrease: bigint;
}

export async function borrow(state: ConstantProduct, reserves: Tokens): Promise<any> {
  const assetOut = await pseudoRandomBigUint(BigNumber.from(state.asset));
  const borrowCollateralIn = await pseudoRandomBigUint(BigNumber.from(state.asset));
  const interestIncrease = await pseudoRandomBigUint(BigNumber.from(divUp(assetOut * state.interest, reserves.asset)));
  const cdpIncrease = await pseudoRandomBigUint(BigNumber.from(divUp(assetOut * state.cdp, reserves.asset)));
  return {
    assetOut,
    borrowCollateralIn,
    interestIncrease,
    cdpIncrease,
  };
}
