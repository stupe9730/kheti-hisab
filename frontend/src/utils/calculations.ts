export const calculateTractorTotal = (landSizeGunta: number, ratePerAcre: number): number => {
  return Math.round((Number(landSizeGunta) / 40) * Number(ratePerAcre));
};
