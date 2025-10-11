import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("VincentAlgorithmicStablecoinModule", (m) => {
  const vas = m.contract("VincentAlgorithmicStablecoin");
  const vasEngine = m.contract("VincentAlgorithmicStablecoinEngine", [vas]);

  return { vas, vasEngine };
});
