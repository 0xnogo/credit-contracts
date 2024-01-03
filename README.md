# credit-contracts

[![Build](https://github.com/0xnogo/credit-contracts/actions/workflows/build.yaml/badge.svg)](https://github.com/0xnogo/credit-contracts/actions/workflows/build.yaml)
[![Lint](https://github.com/0xnogo/credit-contracts/actions/workflows/lint.yaml/badge.svg)](https://github.com/0xnogo/credit-contracts/actions/workflows/lint.yaml)

# Local Development

The following assumes the use of `node@>=14`.

## Install Dependencies

`yarn`

## Compile Contracts

`yarn compile`

## Run Tests

`yarn test`

You may be required to run `yarn clean` before running tests if you have made changes to the contracts (typechain artifacts are automatically generated but not cleaned).

## Deploy

This package uses hardhat-deploy. To deploy to a network, run the following command:

```
yarn deploy localhost
```

For localhost deployments, you can also set up a local fork of mainnet to test against. To do so, run the following command:

```
npx hardhat node
```

hardat-deploy will automatically deploy to it.

You can also deploy one script at a time. To do so, run the following command:

```
npx hardhat deploy --tags AlphaPoolFactory
```

Tags are defines in the deploy scripts.

## Setup a local fork of mainnet

Follow the instruction in the [Technical docs](https://www.notion.so/nogo/Setup-the-localhost-test-env-65849834bee64b6a84e8de9cadec3269?pvs=4).

## Scripts

### Deploy Alpha pool

```
 yarn hardhat createAlphaPool --token-a "address of token" --token-b "address of token" --maturity "1685397700" --allocation-point "10" --tokens-to-distribute "[\"address of token\",\"address of token\"]" --network localhost
```

### Deploy a Credit pool

TBD

### Create LP Farm

```
npx hardhat create-lp-farm --pair "address of pair" --maturity "pool maturity" --allocpoint "alloc point in wei"  --network localhost
```

### Testing out credit staking with the subgraoh

```
npx hardhat performStakingActions --stakingepochseconds "duration of an epoch"
```

## Licensing

The primary license for credit-protocol is the Business Source License 1.1 (`BUSL-1.1`), see [`LICENSE`](./LICENSE).
