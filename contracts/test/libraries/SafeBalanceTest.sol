// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.20;

import { SafeBalance } from "../../core/libraries/SafeBalance.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SafeBalanceTest {
    function safeBalance(IERC20 token) external view returns (uint256) {
        return SafeBalance.safeBalance(token);
    }
}
