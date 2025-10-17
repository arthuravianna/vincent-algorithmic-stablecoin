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
    uint256 public constant STARTING_ERC20_BALANCE = 10 ether;
    uint256 public constant AMOUNT_COLLATERAL = 10 ether;

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
                PythStructs.Price(388998724168, 988558348, -8, block.timestamp), // $3889 with 8 decimals
                PythStructs.Price(388998724168, 988558348, -8, block.timestamp) // $3889 with 8 decimals
            )
        );
        // Set up WBTC Pyth price feed
        updateData[1] = abi.encode(
            PythStructs.PriceFeed(
                wbtcUsdPythPriceFeedId,
                PythStructs.Price(
                    11167963596046, // $111679 with 8 decimals
                    9101788470,
                    -8,
                    block.timestamp
                ),
                PythStructs.Price(
                    11167963596046, // $111679 with 8 decimals
                    9101788470,
                    -8,
                    block.timestamp
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
}
