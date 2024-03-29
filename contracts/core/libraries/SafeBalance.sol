// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

library SafeBalance {
    using Address for address;

    function safeBalance(IERC20 token) internal view returns (uint256) {
        bytes memory data = address(token).functionStaticCall(
            abi.encodeWithSelector(IERC20.balanceOf.selector, address(this)),
            "Failed ERC20 balanceOf"
        );
        return abi.decode(data, (uint256));
    }
}
