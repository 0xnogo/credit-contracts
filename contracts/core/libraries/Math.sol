// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity =0.8.20;

library Math {
    function divUp(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x / y;
        if (x % y != 0) z++;
    }

    function shiftRightUp(uint256 x, uint8 y) internal pure returns (uint256 z) {
        z = x >> y;
        if (x != z << y) z++;
    }
}
