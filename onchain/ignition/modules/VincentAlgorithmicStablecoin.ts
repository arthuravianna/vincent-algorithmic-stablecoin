import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const vincentAlgorithmicStablecoinModule = buildModule("VincentAlgorithmicStablecoinModule", (m) => {
  const vas = m.contract("VincentAlgorithmicStablecoin");

  return { vas };
});


export default buildModule("VincentAlgorithmicStablecoinEngineModule", (m) => {
  // Get the Pyth address directly as a parameter
  // This will be computed and passed from the deploy script
  const pythPriceFeedAddress = m.getParameter("pythPriceFeedAddress", "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21");

  const { vas } = m.useModule(vincentAlgorithmicStablecoinModule);
  const vasEngine = m.contract("VincentAlgorithmicStablecoinEngine", [vas, pythPriceFeedAddress]);
  m.call(vas, "transferOwnership", [vasEngine]);
  return { vas, vasEngine };
});