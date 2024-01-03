import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import { config as dotEnvConfig } from "dotenv";
import "hardhat-contract-sizer";
import "hardhat-dependency-compiler";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import "solidity-coverage";

dotEnvConfig();

import { HttpNetworkUserConfig } from "hardhat/types";
import { advanceTime } from "./scripts/advance_time";
import { createLiqPool } from "./scripts/dex/create_lp";
import { performSwap } from "./scripts/dex/perform_swap";
import { distroUSDC } from "./scripts/distro_usdc";
import { createLPFarm } from "./scripts/farm/create_farm";
import { addMinter } from "./scripts/faucet/add_minter";
import { mintFaucet } from "./scripts/faucet/mint_faucet";
import { whitelistToken } from "./scripts/faucet/whitelist_token";
import { whitelistUser } from "./scripts/faucet/whitelist_user";
import { whitelistUsers } from "./scripts/faucet/whitelist_users";
import { withdrawEth } from "./scripts/faucet/withdraw_eth";
import { getBalance } from "./scripts/get_balance";
import { getUSDC } from "./scripts/get_usdc";
import { createAlphaPool } from "./scripts/gtm/create_alpha_pool";
import { pledge } from "./scripts/gtm/pledge";
import { unpledge } from "./scripts/gtm/unpledge";
import { withdrawAdmin } from "./scripts/gtm/withdraw_admin";
import { addLiquidity } from "./scripts/protocol/add_liquidity";
import { borrow } from "./scripts/protocol/borrow";
import { burn } from "./scripts/protocol/burn";
import { createCreditPair } from "./scripts/protocol/create_credit_pair";
import { distributeCredit } from "./scripts/protocol/distribute_credit";
import { getAprCdp } from "./scripts/protocol/get_apr_cdp";
import { getInputPoolCreation } from "./scripts/protocol/get_input_pool_creation";
import { getPairFee } from "./scripts/protocol/get_pair_fee";
import { getXYZ } from "./scripts/protocol/get_xyz";
import { lend } from "./scripts/protocol/lend";
import { newLiquidity } from "./scripts/protocol/new_liquidity";
import { poolReserve } from "./scripts/protocol/pool_reserve";
import { reimburse } from "./scripts/protocol/reimburse";
import { withdraw } from "./scripts/protocol/withdraw";
import { enableDistribution } from "./scripts/staking/enable_distribution";
import { performStakingActions } from "./scripts/staking/graph_staking_actions";
import { createSwapPair } from "./scripts/swap/create_swap_pool";
import { cpHold } from "./scripts/tokens/cp_hold";
import { transferOwnership } from "./scripts/transfer_ownership";
import { addMerkleRoot } from "./scripts/whitelist/add_merkle_root";
import { createWl } from "./scripts/whitelist/generate_merkle";

const { GOERLI_ALCHEMY_PROJECT_ID, MAINNET_ALCHEMY_PROJECT_ID, TESTNET_PRIVATE_KEY, MAINNET_PRIVATE_KEY } = process.env;

createAlphaPool();
advanceTime();
getBalance();
pledge();
unpledge();
withdrawAdmin();
getUSDC();
createLPFarm();
distroUSDC();
createCreditPair();
newLiquidity();
createSwapPair();
distributeCredit();
addLiquidity();
lend();
borrow();
reimburse();
cpHold();
withdraw();
burn();
enableDistribution();
getPairFee();
performStakingActions();
mintFaucet();
performSwap();
createLiqPool();
transferOwnership();
poolReserve();
whitelistUser();
whitelistToken();
withdrawEth();
whitelistUsers();
addMinter();
getAprCdp();
getXYZ();
addMerkleRoot();
createWl();
getInputPoolCreation();

const DEFAULT_MNEMONIC = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

const mainnetSharedNetworkConfig: HttpNetworkUserConfig = {};
if (MAINNET_PRIVATE_KEY) {
  mainnetSharedNetworkConfig.accounts = [MAINNET_PRIVATE_KEY];
} else {
  mainnetSharedNetworkConfig.accounts = {
    mnemonic: DEFAULT_MNEMONIC,
  };
}

const goerliSharedNetworkConfig: HttpNetworkUserConfig = {};

if (TESTNET_PRIVATE_KEY) {
  goerliSharedNetworkConfig.accounts = [TESTNET_PRIVATE_KEY];
} else {
  goerliSharedNetworkConfig.accounts = {
    mnemonic: DEFAULT_MNEMONIC,
  };
}

export default {
  allowUnlimitedContractSize: true,
  solidity: {
    version: "0.8.20",
    settings: {
      evmVersion: "paris",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  namedAccounts: {
    deployer: 0,
  },
  networks: {
    hardhat: {
      accounts: { accountsBalance: (1n << 256n).toString() },
      gas: 120000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      timeout: 1800000,
    },
    goerli: {
      ...goerliSharedNetworkConfig,
      url: `https://arb-goerli.g.alchemy.com/v2/${GOERLI_ALCHEMY_PROJECT_ID}`,
      chainId: 421613,
      timeout: 18000000,
    },
    melioraTest: {
      ...goerliSharedNetworkConfig,
      url: `https://volatilis-testnet.calderachain.xyz/http`,
      chainId: 3333,
      timeout: 18000000,
    },
    arbitrum: {
      ...mainnetSharedNetworkConfig,
      url: `https://arb-mainnet.g.alchemy.com/v2/${MAINNET_ALCHEMY_PROJECT_ID}`,
      chainId: 42161,
    },
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
    alwaysGenerateOverloads: true,
  },
  mocha: {
    timeout: 60000,
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },
  dependencyCompiler: {
    paths: [
      "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol",
      "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol",
    ],
    keep: true,
  },
  gasReporter: {
    enabled: true,
    // outputFile: "gas-report.txt", // optional
  },
};
