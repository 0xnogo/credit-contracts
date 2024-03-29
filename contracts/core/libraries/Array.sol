// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity =0.8.20;

import { IPair } from "../interfaces/IPair.sol";

library Array {
    function insert(IPair.Due[] storage dues, IPair.Due memory dueOut) internal returns (uint256 id) {
        id = dues.length;

        dues.push(dueOut);
    }
}
