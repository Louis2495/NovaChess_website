export const teamComputerMinRating = 400;
export const teamComputerMaxRating = 3200;
export const teamComputerNativeMinRating = 1320;
export const teamComputerNativeMaxRating = 3190;
export const teamComputerDefaultRating = 1000;
export const teamComputerRatingStep = 1;

export function clampTeamComputerRating(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return teamComputerDefaultRating;
  const rating = Math.round(value);
  return rating >= teamComputerMaxRating
    ? teamComputerMaxRating
    : Math.max(teamComputerMinRating, Math.min(teamComputerNativeMaxRating, rating));
}
