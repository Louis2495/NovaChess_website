export const teamComputerMinRating = 400;
export const teamComputerMaxRating = 2000;
export const teamComputerDefaultRating = 1000;
export const teamComputerRatingStep = 100;

export function clampTeamComputerRating(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return teamComputerDefaultRating;
  return Math.max(teamComputerMinRating, Math.min(teamComputerMaxRating,
    Math.round(value / teamComputerRatingStep) * teamComputerRatingStep));
}
