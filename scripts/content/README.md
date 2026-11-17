# Chess reference content

Run `node scripts/content/encyclopedia.mjs` from the repository root to rebuild `public/data/encyclopedia.json`.

- `encyclopedia.mjs` maintains the original catalog, imports champions/history/opening material, and renders each named opening's real move sequence into SAN using chess.js. Relevant family guides supply structural plans and mistakes to avoid.
- `encyclopedia-expanded.mjs` and `encyclopedia-foundations.mjs` contain 250 original explanatory articles. The first paragraph explains the concept; the practical section supplies context, limitations, or common errors. Existing titles are expanded in place to preserve IDs and aliases.
- Sources are further-reading references, not quotations. Historical titles are dated; platform-specific variants are identified as NovaChess rules. The catalog is broad, not a claim to contain every fact about chess.
- `public/data/personality-quizzes.json` contains the ten new themed quizzes: six original questions and four outcomes each. Answers express chess preferences rather than factual right/wrong answers. Each answer adds one point to its outcome; ties use the first maximum, as in the existing quizzes. The content is intentionally humorous, not a personality or strength assessment.

`tests/unit/expanded-content.test.mjs` checks quiz structure, unique questions, reachable outcomes, topic coverage, article integrity, and exact legal replay of every rendered named opening.
