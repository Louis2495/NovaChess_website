export function resolvePlayColor(choice: string): "w" | "b" {
  if (choice === "random") return Math.random() < 0.5 ? "w" : "b";
  return choice === "b" ? "b" : "w";
}
