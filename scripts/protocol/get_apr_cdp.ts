import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task, types } from "hardhat/config";

// TODO: Use the SubGraph (FE: https://tinyurl.com/55yxb8wu) to get the prices
const getAprCdp: () => void = () => {
  task("getAprCdp", "Get the APR and CDP of a pool")
    .addOptionalParam("x", "User id")
    .addOptionalParam("y", "Pool id")
    .addOptionalParam("z", "Asset in in the pair (in eth)")

    .addOptionalParam("assetin", "Amount of asset in")
    .addOptionalParam("debtin", "Amount of debt in")
    .addOptionalParam("collateralin", "Amount of collateral in")

    .addParam("maturity", "maturity in seconds")
    .addParam("assetPrice", "Asset price in $ x100 (if $1.83 then 183)")
    .addParam("collateralPrice", "Collateral price in $ x100 (if $1.83 then 183)")
    .addOptionalParam("percent", "percent", 2 ** 31, types.int)
    .setAction(async (taskArgs, hardhatRuntime) => {
      const assetPrice = hardhatRuntime.ethers.BigNumber.from(taskArgs.assetPrice);
      const collateralPrice = hardhatRuntime.ethers.BigNumber.from(taskArgs.collateralPrice);

      const maturity = hardhatRuntime.ethers.BigNumber.from(taskArgs.maturity);
      const secondsInYear = hardhatRuntime.ethers.BigNumber.from(31536000);
      const twoPower32 = hardhatRuntime.ethers.BigNumber.from(2 ** 32);

      let cdp;
      let apr;
      let interestForMaturity;

      if (taskArgs.x) {
        const x = hardhatRuntime.ethers.BigNumber.from(taskArgs.x);
        const y = hardhatRuntime.ethers.BigNumber.from(taskArgs.y);
        const z = hardhatRuntime.ethers.BigNumber.from(taskArgs.z);

        // APR calculation
        apr = y.mul(secondsInYear).div(x.mul(twoPower32)).mul(100);
        interestForMaturity = apr.mul(maturity).div(secondsInYear);

        // CDP calculation
        cdp = z.mul(collateralPrice).div(x.mul(assetPrice)).mul(100);
      } else {
        const assetIn = hardhatRuntime.ethers.BigNumber.from(taskArgs.assetin);
        const debtIn = hardhatRuntime.ethers.BigNumber.from(taskArgs.debtin);
        const collateralIn = hardhatRuntime.ethers.BigNumber.from(taskArgs.collateralin);

        // APR calculation
        interestForMaturity = debtIn.sub(assetIn).mul(100).div(assetIn);
        apr = interestForMaturity.mul(secondsInYear).div(maturity);

        // CDP calculation
        // CDP calculation giving 0 for < 1% result)
        cdp = collateralIn.mul(collateralPrice).mul(100).div(assetIn.mul(assetPrice));
      }

      console.log(`APR: ${apr.toString()}%`);
      console.log(`Interest for the maturity: ${interestForMaturity.toString()}%`);
      console.log(`CDP: ${cdp.toString()}%`);
    });
};
export { getAprCdp };
