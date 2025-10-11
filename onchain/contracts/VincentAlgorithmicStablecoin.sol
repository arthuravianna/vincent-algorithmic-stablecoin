// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Vincent Algorithmic Stablecoin (VAS)
 * @author Arthur Vianna
 * Collateral: Exogenous (wETH, wBTC, etc)
 * Minting: Algorithmic
 * Relative Stability: Pegged to USD
 *
 * ERC20 implementation of the stablecoin.
 */
contract VincentAlgorithmicStablecoin is ERC20, ERC20Burnable, Ownable {
    error VincentAlgorithmicStablecoin_NotZeroAddress();
    error VincentAlgorithmicStablecoin_MustBeMoreThanZero();

    constructor() ERC20("VincentAlgorithmicStablecoin", "VAS") Ownable(msg.sender) {}

    function mint(address to, uint256 amount) external onlyOwner returns (bool) {
        if (to == address(0)) {
            revert VincentAlgorithmicStablecoin_NotZeroAddress();
        }

        if (amount <= 0) {
            revert VincentAlgorithmicStablecoin_MustBeMoreThanZero();
        }

        _mint(to, amount);
        return true;
    }

    function burn(uint256 amount) public override onlyOwner {
        if (amount <= 0) {
            revert VincentAlgorithmicStablecoin_MustBeMoreThanZero();
        }

        uint256 balance = balanceOf(msg.sender);
        require(balance >= amount, "ERC20: burn amount exceeds balance");

        super.burn(amount);
    }
}
