// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {VincentAlgorithmicStablecoin} from "../contracts/VincentAlgorithmicStablecoin.sol";
import {VincentAlgorithmicStablecoinEngine} from "../contracts/VincentAlgorithmicStablecoinEngine.sol";
import {MockPyth} from "@pythnetwork/pyth-sdk-solidity/MockPyth.sol";
import {PythStructs} from "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import {MockERC20} from "./mocks/MockErc20.sol";

contract VincentAlgorithmicStablecoinEngineTest is Test {
    using SafeERC20 for IERC20;

    MockERC20 public wethMock;
    MockERC20 public wbtcMock;
    bytes32 public constant wethUsdPythPriceFeedId = bytes32("WETH");
    bytes32 public constant wbtcUsdPythPriceFeedId = bytes32("WBTC");
    uint public constant PythValidTimePeriod = 3600; // 1 hour
    uint public constant PythSingleUpdateFeeInWei = 0; // 0 fee

    address public USER = makeAddr("USER");
    address public LIQUIDATOR = makeAddr("LIQUIDATOR");
    int64 public constant WETH_PRICE = 300000000000; // $3000 with 8 decimals
    int64 public constant WBTC_PRICE = 10000000000000; // $100000 with 8 decimals
    uint64 public constant PRICE_FEED_CONFIDENCE = 988558348; // example confidence interval
    int32 public constant PRICE_FEED_DECIMALS = -8;
    uint public constant PRICE_FEED_PUBLISH_TIME = 1;
    uint256 public constant STARTING_ERC20_BALANCE = 10 ether;
    uint256 public constant AMOUNT_COLLATERAL = 10 ether;
    uint256 public constant AMOUNT_VAS_BACKED_BY_WETH_COLLATERAL = 15000 ether; // $3000 * 10 ETH / 2 = 15000 VAS
    uint256 public constant AMOUNT_VAS_BACKED_BY_WBTC_COLLATERAL = 500000 ether; // $100000 * 10 WBTC / 2 = 500000 VAS

    VincentAlgorithmicStablecoin public vas;
    MockPyth public mockPyth;
    VincentAlgorithmicStablecoinEngine public engine;

    function setUp() public {
        vas = new VincentAlgorithmicStablecoin();

        mockPyth = new MockPyth(PythValidTimePeriod, PythSingleUpdateFeeInWei);
        bytes[] memory updateData = new bytes[](2);

        // Set up WETH Pyth price feed
        updateData[0] = abi.encode(
            PythStructs.PriceFeed(
                wethUsdPythPriceFeedId,
                PythStructs.Price(
                    WETH_PRICE,
                    PRICE_FEED_CONFIDENCE,
                    PRICE_FEED_DECIMALS,
                    PRICE_FEED_PUBLISH_TIME
                ), // $3000 with 8 decimals
                PythStructs.Price(
                    WETH_PRICE,
                    PRICE_FEED_CONFIDENCE,
                    PRICE_FEED_DECIMALS,
                    PRICE_FEED_PUBLISH_TIME
                ) // $3000 with 8 decimals
            )
        );
        // Set up WBTC Pyth price feed
        updateData[1] = abi.encode(
            PythStructs.PriceFeed(
                wbtcUsdPythPriceFeedId,
                PythStructs.Price(
                    WBTC_PRICE,
                    PRICE_FEED_CONFIDENCE,
                    PRICE_FEED_DECIMALS,
                    PRICE_FEED_PUBLISH_TIME
                ),
                PythStructs.Price(
                    WBTC_PRICE,
                    PRICE_FEED_CONFIDENCE,
                    PRICE_FEED_DECIMALS,
                    PRICE_FEED_PUBLISH_TIME
                ) // EMA price, not used in this test
            )
        );
        // Update the mock Pyth contract with the price feeds
        mockPyth.updatePriceFeeds{value: 0}(updateData);

        // Instantiate Mock ERC20 tokens
        wethMock = new MockERC20("WETH", "WETH", USER, STARTING_ERC20_BALANCE);
        wbtcMock = new MockERC20("WBTC", "WBTC", USER, STARTING_ERC20_BALANCE);

        address[] memory tokenAddresses = new address[](2);
        tokenAddresses[0] = address(wethMock);
        tokenAddresses[1] = address(wbtcMock);
        bytes32[] memory pythFeedIds = new bytes32[](2);
        pythFeedIds[0] = wethUsdPythPriceFeedId;
        pythFeedIds[1] = wbtcUsdPythPriceFeedId;

        engine = new VincentAlgorithmicStablecoinEngine(
            vas,
            address(mockPyth),
            tokenAddresses,
            pythFeedIds
        );
        vas.transferOwnership(address(engine));
    }

    modifier depositedCollateral(address tokenAddress) {
        vm.startPrank(USER);
        MockERC20(tokenAddress).approve(address(engine), AMOUNT_COLLATERAL);
        engine.depositCollateral(tokenAddress, AMOUNT_COLLATERAL);
        vm.stopPrank();
        _;
    }

    modifier depositedCollateralAndMinted(address tokenAddress) {
        vm.startPrank(USER);
        MockERC20(tokenAddress).approve(address(engine), AMOUNT_COLLATERAL);
        uint256 amountVasToMint = 0;
        if (tokenAddress == address(wethMock)) {
            amountVasToMint = AMOUNT_VAS_BACKED_BY_WETH_COLLATERAL;
        } else if (tokenAddress == address(wbtcMock)) {
            amountVasToMint = AMOUNT_VAS_BACKED_BY_WBTC_COLLATERAL;
        }

        bytes[] memory pythPriceUpdates = new bytes[](0);
        uint64[] memory pythPublishTimes = new uint64[](2);
        pythPublishTimes[0] = 0;
        pythPublishTimes[1] = 0;
        engine.depositCollateralAndMint(
            tokenAddress,
            AMOUNT_COLLATERAL,
            amountVasToMint,
            pythPriceUpdates,
            pythPublishTimes
        );
        vm.stopPrank();
        _;
    }

    function testRevertsIfTokenAddressesLengthDoesntMatchPythFeedsIds() public {
        address[] memory tokenAddresses = new address[](1);
        bytes32[] memory pythFeedIds = new bytes32[](2);
        tokenAddresses[0] = address(wethMock);
        pythFeedIds[0] = wethUsdPythPriceFeedId;
        pythFeedIds[1] = wbtcUsdPythPriceFeedId;

        vm.expectRevert(
            VincentAlgorithmicStablecoinEngine
                .VincentAlgorithmicStablecoinEngine_TokenAddressesAndPriceFeedIdsMustBeSameLength
                .selector
        );
        new VincentAlgorithmicStablecoinEngine(
            vas,
            address(mockPyth),
            tokenAddresses,
            pythFeedIds
        );
    }

    function testDepositRevertsIfCollateralZero() public {
        vm.startPrank(USER);
        wethMock.approve(address(engine), AMOUNT_COLLATERAL);

        vm.expectRevert(
            VincentAlgorithmicStablecoinEngine
                .VincentAlgorithmicStablecoinEngine_AmountMustBeGreaterThanZero
                .selector
        );
        engine.depositCollateral(address(wethMock), 0);
        vm.stopPrank();
    }

    function testDepositRevertsIfTokenNotSupported() public {
        MockERC20 randomToken = new MockERC20(
            "RDT",
            "RDT",
            USER,
            STARTING_ERC20_BALANCE
        );
        vm.startPrank(USER);
        randomToken.approve(address(engine), AMOUNT_COLLATERAL);

        vm.expectRevert(
            VincentAlgorithmicStablecoinEngine
                .VincentAlgorithmicStablecoinEngine_UnsupportedCollateralToken
                .selector
        );
        engine.depositCollateral(address(randomToken), AMOUNT_COLLATERAL);
        vm.stopPrank();
    }

    function testGetAccountInformationBalances()
        public
        depositedCollateral(address(wethMock))
        depositedCollateral(address(wbtcMock))
    {
        (
            uint256 totalVasMinted,
            VincentAlgorithmicStablecoinEngine.TokenBalance[] memory balances
        ) = engine.getAccountInformationBalances(USER);

        assertEq(
            totalVasMinted,
            0,
            "Total VAS minted should match WBTC collateral"
        );
        assertEq(
            balances[0].amount,
            AMOUNT_COLLATERAL,
            "WETH collateral balance should match deposited amount"
        );
        assertEq(
            balances[1].amount,
            AMOUNT_COLLATERAL,
            "WBTC collateral balance should match deposited amount"
        );
    }

    function testGetAccountInformationBalancesMinted()
        public
        depositedCollateralAndMinted(address(wbtcMock))
    {
        (
            uint256 totalVasMinted,
            VincentAlgorithmicStablecoinEngine.TokenBalance[] memory balances
        ) = engine.getAccountInformationBalances(USER);

        assertEq(
            totalVasMinted,
            AMOUNT_VAS_BACKED_BY_WBTC_COLLATERAL,
            "Total VAS minted should match WBTC collateral"
        );
        assertEq(
            balances[0].amount,
            0,
            "WETH collateral balance should match deposited amount"
        );
        assertEq(
            balances[1].amount,
            AMOUNT_COLLATERAL,
            "WBTC collateral balance should match deposited amount"
        );
    }

    function testRevertsIfMintBreaksHealthFactor()
        public
        depositedCollateral(address(wethMock))
    {
        vm.startPrank(USER);
        uint256 amountVasToMint = AMOUNT_VAS_BACKED_BY_WETH_COLLATERAL + 1; // Exceeding the allowed mint amount

        bytes[] memory pythPriceUpdates = new bytes[](0);
        uint64[] memory pythPublishTimes = new uint64[](2);
        pythPublishTimes[0] = 0;
        pythPublishTimes[1] = 0;

        uint256 expectedUserHealthFactor = 999999999999999999;
        vm.expectRevert(
            abi.encodeWithSelector(
                VincentAlgorithmicStablecoinEngine
                    .VincentAlgorithmicStablecoinEngine_HealthFactorIsBroken
                    .selector,
                expectedUserHealthFactor
            )
        );
        engine.mintVas(amountVasToMint, pythPriceUpdates, pythPublishTimes);
        vm.stopPrank();
    }

    function testLiquidate()
        public
        depositedCollateralAndMinted(address(wbtcMock))
    {
        // make the WBTC price drop to break USER's health factor
        // from 200% to 100%
        // so that he can be liquidated
        bytes[] memory updateData = new bytes[](1);

        // Set up WBTC Pyth price feed
        updateData[0] = abi.encode(
            PythStructs.PriceFeed(
                wbtcUsdPythPriceFeedId,
                PythStructs.Price(
                    (WBTC_PRICE * 3) / 4, // 25% price drop
                    PRICE_FEED_CONFIDENCE,
                    PRICE_FEED_DECIMALS,
                    PRICE_FEED_PUBLISH_TIME + 1
                ),
                PythStructs.Price(
                    (WBTC_PRICE * 3) / 4, // 25% price drop
                    PRICE_FEED_CONFIDENCE,
                    PRICE_FEED_DECIMALS,
                    PRICE_FEED_PUBLISH_TIME + 1
                )
            )
        );
        mockPyth.updatePriceFeeds{value: 0}(updateData);

        (uint256 startingUserTotalVasMinted, ) = engine
            .getAccountInformationBalances(USER);
        uint256 debtToCover = AMOUNT_VAS_BACKED_BY_WBTC_COLLATERAL / 4; // debt to cover is 25% of previous value

        // seting up LIQUIDATOR
        // 1) give them WBTC
        // 2) approve the VAS Engine
        // 3) deposit collateral and mint VAS to be able to liquidate
        uint256 liquidatorAmountCollateral = 4 * AMOUNT_COLLATERAL;
        uint256 liquidatorAmountVasBackedByCollateral = 2 *
            AMOUNT_VAS_BACKED_BY_WBTC_COLLATERAL;
        wbtcMock.mint(LIQUIDATOR, liquidatorAmountCollateral);

        vm.startPrank(LIQUIDATOR);
        wbtcMock.approve(address(engine), liquidatorAmountCollateral);
        bytes[] memory pythPriceUpdates = new bytes[](0);
        uint64[] memory pythPublishTimes = new uint64[](2);
        pythPublishTimes[0] = 0;
        pythPublishTimes[1] = 0;
        engine.depositCollateralAndMint(
            address(wbtcMock),
            liquidatorAmountCollateral,
            liquidatorAmountVasBackedByCollateral,
            pythPriceUpdates,
            pythPublishTimes
        );

        // liquidator allows VAS Engine to burn their VAS
        // to cover for USER debt
        vas.approve(address(engine), debtToCover);
        engine.liquidate(
            address(wbtcMock),
            USER,
            debtToCover,
            pythPriceUpdates,
            pythPublishTimes
        );
        (uint256 endingUserTotalVasMinted, ) = engine
            .getAccountInformationBalances(USER);

        // assert
        assert(startingUserTotalVasMinted > endingUserTotalVasMinted);
        vm.stopPrank();
    }
}
