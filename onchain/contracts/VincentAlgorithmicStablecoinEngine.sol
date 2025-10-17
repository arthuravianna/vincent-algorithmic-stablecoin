// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "@pythnetwork/pyth-sdk-solidity/PythUtils.sol";

import {VincentAlgorithmicStablecoin} from "./VincentAlgorithmicStablecoin.sol";

/**
 * @title VincentAlgorithmicStablecoinEngine
 * @author Arthur Vianna
 * @notice This contract handles all the logic for minting and redeeming VAS, as well as depositing & withdrawing collateral.
 */
contract VincentAlgorithmicStablecoinEngine is ReentrancyGuard {
    using SafeERC20 for IERC20;

    error VincentAlgorithmicStablecoinEngine_TokenAddressesAndPriceFeedIdsMustBeSameLength();
    error VincentAlgorithmicStablecoinEngine_UnsupportedCollateralToken();
    error VincentAlgorithmicStablecoinEngine_HealthFactorIsBroken(
        uint256 healthFactor
    );
    error VincentAlgorithmicStablecoinEngine_MintFailed();
    error VincentAlgorithmicStablecoinEngine_AmountMustBeGreaterThanZero();

    VincentAlgorithmicStablecoin private immutable i_vas;
    uint8 private constant PRECISION_EXPONENT = 18;
    uint256 private constant PRECISION = 10 ** PRECISION_EXPONENT;
    uint256 private constant LIQUIDATION_THRESHOLD = 50; // 200% overcollateralized
    uint256 private constant LIQUIDATION_PRECISION = 100;
    uint256 private constant MIN_HEALTH_FACTOR = PRECISION; // 1x health factor

    // The IPyth interface from pyth-sdk-solidity provides the methods to interact with the Pyth contract.
    // Instantiate it with the Pyth contract address from https://docs.pyth.network/price-feeds/contract-addresses/evm
    IPyth private immutable i_pyth;
    uint256 private immutable i_priceFeedAgeInSeconds = 60; // 1 minute
    address[] private s_acceptedCollateralTokens;

    bytes32[] private s_priceFeedIds;
    mapping(address token => bytes32 priceFeedId) private s_tokenToPriceFeedId;
    mapping(address user => mapping(address token => uint256 amount))
        private s_collateralBalances;
    mapping(address user => uint256 amountVasMinted) private s_VasMinted;

    //
    // EVENTS
    //
    event CollateralDeposited(
        address indexed user,
        address indexed token,
        uint256 amount
    );

    //
    // MODIFIERS
    //
    modifier isAcceptedCollateralToken(address token) {
        if (s_tokenToPriceFeedId[token] == bytes32(0)) {
            revert VincentAlgorithmicStablecoinEngine_UnsupportedCollateralToken();
        }
        _;
    }

    modifier nonZeroAmount(uint256 amount) {
        if (amount == 0) {
            revert VincentAlgorithmicStablecoinEngine_AmountMustBeGreaterThanZero();
        }
        _;
    }

    //
    // CONSTRUCTOR
    //
    constructor(
        VincentAlgorithmicStablecoin vas,
        address pythContract,
        address[] memory tokenAddresses,
        bytes32[] memory pythFeedIds
    ) {
        if (tokenAddresses.length != pythFeedIds.length) {
            revert VincentAlgorithmicStablecoinEngine_TokenAddressesAndPriceFeedIdsMustBeSameLength();
        }

        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            s_acceptedCollateralTokens.push(tokenAddresses[i]);
            s_tokenToPriceFeedId[tokenAddresses[i]] = pythFeedIds[i];
            s_priceFeedIds.push(pythFeedIds[i]);
        }

        i_vas = vas;
        i_pyth = IPyth(pythContract);
    }

    //
    // PUBLIC FUNCTIONS
    //

    /**
     *
     * @param token address of the deposited token
     * @param amount amount of the deposited token
     * @notice Deposit a collateral
     */
    function depositCollateral(
        address token,
        uint256 amount
    )
        public
        nonReentrant
        isAcceptedCollateralToken(token)
        nonZeroAmount(amount)
    {
        // Transfer the collateral tokens from the user to the contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Update the user's collateral balance
        s_collateralBalances[msg.sender][token] += amount;

        emit CollateralDeposited(msg.sender, token, amount);
    }

    /**
     * @param amountVasToMint amount of VAS to mint
     * @param pythPriceUpdates Pyth price updates
     * @param pythPublishTimes Pyth publish times
     * @notice Mints VAS tokens to the caller's address after ensuring they remain overcollateralized.
     * @notice Pyth is a PULL oracle, so we need to provide the price updates and publish times.
     */
    function mintVas(
        uint256 amountVasToMint,
        bytes[] calldata pythPriceUpdates,
        uint64[] memory pythPublishTimes
    ) public payable nonReentrant nonZeroAmount(amountVasToMint) {
        s_VasMinted[msg.sender] += amountVasToMint;

        // update prices Pyth price feeds if needed (Pull Oracle)
        _updatePythPricesIfNeeded(pythPriceUpdates, pythPublishTimes);

        // should revert if user becomes undercollateralized
        _revertIfHealthFactorIsBroken(msg.sender);

        bool minted = i_vas.mint(msg.sender, amountVasToMint);
        if (!minted) {
            revert VincentAlgorithmicStablecoinEngine_MintFailed();
        }
    }

    //
    // EXTERNAL FUNCTIONS
    //

    /**
     *
     * @param token the deposited token/collateral address
     * @param amountCollateral amount of the deposited token
     * @param amountVasToMint amount of VAS to be minted
     * @param pythPriceUpdates Pyth price updates
     * @param pythPublishTimes Pyth publish times
     * @notice This function allows users to deposit collateral and mint VAS tokens in a single transaction.
     * @notice It first deposits the specified amount of collateral and then mints the requested amount of VAS tokens.
     * @notice The function ensures that the user remains overcollateralized
     */
    function depositCollateralAndMint(
        address token,
        uint256 amountCollateral,
        uint256 amountVasToMint,
        bytes[] calldata pythPriceUpdates,
        uint64[] memory pythPublishTimes
    )
        external
        payable
        nonReentrant
        isAcceptedCollateralToken(token)
        nonZeroAmount(amountCollateral)
        nonZeroAmount(amountVasToMint)
    {
        depositCollateral(token, amountCollateral);
        mintVas(amountVasToMint, pythPriceUpdates, pythPublishTimes);
    }

    //
    // PRIVATE FUNCTIONS
    //

    // function copied from PythUtils.sol
    function _convertToUint(
        int64 price,
        int32 expo,
        uint8 targetDecimals
    ) public pure returns (uint256) {
        if (price < 0) {
            revert PythErrors.NegativeInputPrice();
        }
        if (expo < -255) {
            revert PythErrors.InvalidInputExpo();
        }

        // If targetDecimals is 6, we want to multiply the final price by 10 ** -6
        // So the delta exponent is targetDecimals + currentExpo
        int32 deltaExponent = int32(uint32(targetDecimals)) + expo;

        // Bounds check: prevent overflow/underflow with base 10 exponentiation
        // Calculation: 10 ** n <= (2 ** 256 - 63) - 1
        //              n <= log10((2 ** 193) - 1)
        //              n <= 58.2
        if (deltaExponent > 58 || deltaExponent < -58)
            revert PythErrors.ExponentOverflow();

        // We can safely cast the price to uint256 because the above condition will revert if the price is negative
        uint256 unsignedPrice = uint256(uint64(price));

        if (deltaExponent > 0) {
            (bool success, uint256 result) = Math.tryMul(
                unsignedPrice,
                10 ** uint32(deltaExponent)
            );
            // This condition is unreachable since we validated deltaExponent bounds above.
            // But keeping it here for safety.
            if (!success) {
                revert PythErrors.CombinedPriceOverflow();
            }
            return result;
        } else {
            (bool success, uint256 result) = Math.tryDiv(
                unsignedPrice,
                10 ** uint(Math.abs(deltaExponent))
            );
            // This condition is unreachable since we validated deltaExponent bounds above.
            // But keeping it here for safety.
            if (!success) {
                revert PythErrors.CombinedPriceOverflow();
            }
            return result;
        }
    }

    /**
     *
     * @param pythPriceUpdates Pyth price updates
     * @param pythPublishTimes Pyth publish times
     * @notice Updates Pyth price feeds if necessary by paying the required fee.
     */
    function _updatePythPricesIfNeeded(
        bytes[] calldata pythPriceUpdates,
        uint64[] memory pythPublishTimes
    ) private {
        uint fee = i_pyth.getUpdateFee(pythPriceUpdates);
        i_pyth.updatePriceFeedsIfNecessary{value: fee}(
            pythPriceUpdates,
            s_priceFeedIds,
            pythPublishTimes
        );
    }

    /**
     * @param token token/collateral to get value in USD
     * @param amount amount of the token/collateral to get value in USD
     * @notice Returns the USD value of a given amount of a specific token/collateral.
     * @notice Uses Pyth oracle to get the latest price of the token and converts it to USD value.
     * @notice getPriceNoOlderThan will revert if the price is older than the specified age.
     * @return USD value of the specified amount of the token.
     */
    function _getUsdValue(
        address token,
        uint256 amount
    ) private view returns (uint256) {
        // 1. Get the price of the token
        // 2. Convert the amount of token to USD value
        // 3. Return the USD value
        bytes32 priceFeedId = s_tokenToPriceFeedId[token];
        PythStructs.Price memory currentBasePrice = i_pyth.getPriceNoOlderThan(
            priceFeedId,
            i_priceFeedAgeInSeconds
        );

        // Convert Pyth price to uint256 with PRECISION_EXPONENT decimal precision using PythUtils
        // uint256 price = PythUtils.convertToUint(
        //     currentBasePrice.price,
        //     currentBasePrice.expo,
        //     PRECISION_EXPONENT
        // );
        uint256 price = _convertToUint(
            currentBasePrice.price,
            currentBasePrice.expo,
            PRECISION_EXPONENT
        );

        // Calculate USD value: (amount * price) / PRECISION
        return (amount * price) / PRECISION;
    }

    /**
     *
     * @param user user address to get information from
     * @return totalVasMinted
     * @return collateralValueInUsd
     * @notice Returns the total VAS minted and the total collateral value in USD for a given user.
     */
    function _getAccountInformation(
        address user
    )
        private
        view
        returns (uint256 totalVasMinted, uint256 collateralValueInUsd)
    {
        totalVasMinted = s_VasMinted[user];

        collateralValueInUsd = 0;
        for (uint256 i = 0; i < s_acceptedCollateralTokens.length; i++) {
            address token = s_acceptedCollateralTokens[i];
            uint256 amount = s_collateralBalances[user][token];
            if (amount > 0) {
                collateralValueInUsd += _getUsdValue(token, amount);
            }
        }
    }

    /**
     *
     * @param user address of the user to check health
     * @notice checks if the user is overcollateralized (healthy)
     */
    function _healthFactor(address user) private view returns (uint256) {
        // 1. Get total VAS minted
        // 2. Get total collateral VALUE
        // 3. Verify if user is still overcollateralized
        (
            uint256 totalVasMinted,
            uint256 collateralValueInUsd
        ) = _getAccountInformation(user);
        if (totalVasMinted == 0) {
            return type(uint256).max;
        }

        // health factor formula
        // https://aave.com/help/borrowing/liquidations
        // Health Factor = (Total Collateral Value * Weighted Average Liquidation Threshold) / Total Borrow Value
        uint256 collateralAdjustedForThreshold = (collateralValueInUsd *
            LIQUIDATION_THRESHOLD) / LIQUIDATION_PRECISION;
        return (collateralAdjustedForThreshold * PRECISION) / totalVasMinted;
    }

    /**
     *
     * @param user address of the user to check health
     * @notice revert if user is undercollateralized (unhealthy)
     */
    function _revertIfHealthFactorIsBroken(address user) private view {
        // 1. Check health factor
        // 2. Revert if user is not healthy
        uint256 userHealthFactor = _healthFactor(user);
        if (userHealthFactor < MIN_HEALTH_FACTOR) {
            revert VincentAlgorithmicStablecoinEngine_HealthFactorIsBroken(
                userHealthFactor
            );
        }
    }
}
