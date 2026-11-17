# Quiz illustrations

All artwork is bundled for offline use. Every sheet uses four columns and two rows, indexed 0–7 from left to right, top to bottom. `src/lib/quizArtwork.ts` maps quiz IDs and outcome indices to the correct picture.

| Sheet | Top row | Bottom row |
| --- | --- | --- |
| `food-villains.webp` | Hot chips, trail mix, sandwich, pocket spaghetti | Back-rank villain, squeeze lord, tax collector, preparation goblin |
| `travel-chat.webp` | Volcano, museum, cabin, mystery suitcase | Tactical chat poster, annotator, sensible friend, chaos poster |
| `animals-weather.webp` | Squirrel, octopus, tortoise, raccoon | Thunderstorm, pressure cloud, clear skies, knight tornado |
| `restaurants-wizards.webp` | Buffet, tasting menu, diner, food truck | Fire wizard, magic academy, safe castling school, underpromotion spellbook |
| `survival-movies.webp` | Counterattacker, fortress, emergency kit, decoy | Action, drama, detective, comedy |
| `princesses-archetypes.webp` | Sword/blossom, book/rose, lily tiara/frog, lantern/braid | Attacker, architect, detective, explorer |

`illustrations.webp` retains the three original quiz introductions and the trivia trophy. Its generic outcome tiles have been replaced by the subject-specific pictures above.

The ten additional quizzes live in `public/data/personality-quizzes.json`: 60 chess-preference questions and 40 humorous outcomes. Each supports going back, retaking, and returning to selection. Titles appear on selection cards, not repeated on questions. Result illustrations identify the outcome itself, rather than recycling one generic archetype across unrelated quizzes.

The standalone transparent homepage group is `public/home-team.webp`, derived from the Team Chess artwork. It does not have an opaque square background.
