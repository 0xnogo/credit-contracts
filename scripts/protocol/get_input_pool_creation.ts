import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { task } from "hardhat/config";

const getInputPoolCreation: () => void = () => {
  task("getInputPoolCreation", "Get the APR and CDP of a pool")
    .addParam("maturity", "maturity in seconds")
    .addParam("assetPrice", "Asset price in $ x100 (if $1.83 then 183)")
    .addParam("collateralPrice", "Collateral price in $ x100 (if $1.83 then 183)")
    .addParam("apr", "APR in % x100 (if 10% then 1000")
    .addParam("cdp", "CDP in %")
    .addParam("assetIn", "Asset in the pair (should be >= 1000)")
    .addOptionalParam("assetDecimals", "Asset decimals", "18")
    .setAction(async (taskArgs, hardhatRuntime) => {
      const apr = hardhatRuntime.ethers.BigNumber.from(taskArgs.apr);
      const cdp = hardhatRuntime.ethers.BigNumber.from(taskArgs.cdp);
      const assetIn = hardhatRuntime.ethers.utils.parseUnits(taskArgs.assetIn, taskArgs.assetDecimals);
      const assetPrice = hardhatRuntime.ethers.BigNumber.from(taskArgs.assetPrice);
      const collateralPrice = hardhatRuntime.ethers.BigNumber.from(taskArgs.collateralPrice);
      const maturity = hardhatRuntime.ethers.BigNumber.from(taskArgs.maturity);
      const secondsInYear = hardhatRuntime.ethers.BigNumber.from(31536000);

      const maturityAPR = apr.mul(maturity).div(secondsInYear);
      console.log(maturityAPR.toString());
      const debtIn = assetIn.add(assetIn.mul(maturityAPR).div(100).div(100));
      const collateralIn = assetIn.mul(assetPrice).mul(cdp).div(100).div(collateralPrice);

      console.log(`assetIn: ${assetIn.toString()}`);
      console.log(`debtIn: ${debtIn.toString()}`);
      console.log(`collateralIn: ${collateralIn.toString()}`);
      console.log(`maturity: ${maturity.toString()}`);
    });
};
export { getInputPoolCreation };
