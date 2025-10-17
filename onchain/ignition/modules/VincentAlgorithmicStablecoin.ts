import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const vincentAlgorithmicStablecoinModule = buildModule(
  "VincentAlgorithmicStablecoinModule",
  (m) => {
    const vas = m.contract("VincentAlgorithmicStablecoin");

    return { vas };
  }
);

const PythUtilsModule = buildModule(
  "PythUtilsModule",
  (m) => {
    const pythUtils = m.contract("PythUtils");

    return { pythUtils };
  }
);

export default buildModule("VincentAlgorithmicStablecoinEngineModule", (m) => {
  // Get the Pyth address directly as a parameter
  // This will be computed and passed from the deploy script
  const pythPriceFeedAddress = m.getParameter(
    "pythPriceFeedAddress",
    "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21"
  );

  // Get token addresses and price feed IDs as parameters
  // These will be computed and passed from the deploy script based on the chain
  const tokenAddresses = m.getParameter("tokenAddresses", []);
  const priceFeedIds = m.getParameter("priceFeedIds", []);

  const { vas } = m.useModule(vincentAlgorithmicStablecoinModule);
  //const { pythUtils } = m.useModule(PythUtilsModule);
  const vasEngine = m.contract("VincentAlgorithmicStablecoinEngine", [
    vas,
    pythPriceFeedAddress,
    tokenAddresses,
    priceFeedIds,
  ], 
    //{libraries: {PythUtils: pythUtils  }}
  );
  m.call(vas, "transferOwnership", [vasEngine]);
  return { vas, vasEngine };
});
