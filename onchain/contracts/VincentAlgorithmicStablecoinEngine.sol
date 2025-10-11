// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

import {VincentAlgorithmicStablecoin} from "./VincentAlgorithmicStablecoin.sol";

/**
 * @title VincentAlgorithmicStablecoinEngine
 * @author Arthur Vianna
 * @notice This contract handles all the logic for minting and redeeming VAS, as well as depositing & withdrawing collateral.
*/
contract VincentAlgorithmicStablecoinEngine is ReentrancyGuard {
    VincentAlgorithmicStablecoin private immutable i_vas;

    // The IPyth interface from pyth-sdk-solidity provides the methods to interact with the Pyth contract.
    // Instantiate it with the Pyth contract address from https://docs.pyth.network/price-feeds/contract-addresses/evm
    IPyth private immutable i_pyth;


    constructor(VincentAlgorithmicStablecoin vas, address pythContract) {
        i_vas = vas;
        i_pyth = IPyth(pythContract);
    }
}
