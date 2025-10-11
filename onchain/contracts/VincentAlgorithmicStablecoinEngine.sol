// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {VincentAlgorithmicStablecoin} from "./VincentAlgorithmicStablecoin.sol";

/**
 * @title VincentAlgorithmicStablecoinEngine
 * @author Arthur Vianna
 * @notice This contract handles all the logic for minting and redeeming VAS, as well as depositing & withdrawing collateral.
*/
contract VincentAlgorithmicStablecoinEngine is ReentrancyGuard {
    VincentAlgorithmicStablecoin private immutable i_vas;

    constructor(VincentAlgorithmicStablecoin vas) {
        i_vas = vas;
    }
}
