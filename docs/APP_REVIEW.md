# NovaChess iPhone app review

Source reviewed: `Louis2495/ChessVision`, commit `46004d96707c9957c0a126296efd0a6dc033e18d`, version 0.30.0. The current source was inspected, rather than treating the README’s historical changelog as the current interface. The iOS application cannot be run on this Linux machine; website previews are illustrations, not captured iPhone screenshots.

## Current product

| Area | Source reviewed | Website treatment |
| --- | --- | --- |
| Navigation / Home | `Features/AppTabs.swift`, `HomeView.swift` | Five tabs: Home, Analysis, Play, Puzzles, Learn; clock and daily puzzle are Home utilities. |
| Analysis / capture | `UI/ContentView.swift`, `AnalysisView.swift`, `Core/EngineInfo.swift`, recognition docs | Local Stockfish 19, board/photo import, insights and candidates. The interactive web sandbox validates legal moves but does not run Stockfish. Camera recognition is explicitly experimental. |
| Computer play | `Features/ComputerPlayView.swift`, `Core/VariantGame.swift`, `Services/VariantRules.swift` | Adaptive/opponent choices, standard and variant play. Five visual variant previews; other variants named briefly. No fabricated Elo comparison. |
| Puzzles | `Features/PuzzleTrainingView.swift`, `Core/TrainingAssets.swift`, `Core/Resources/Puzzles.json` | 4,000 offline puzzles, daily practice and streaks. Three actual bundled checkmate puzzles used as working web demos. Opponent setup moves are applied before the user solves. Legal alternate mates are accepted. |
| Openings / repertoire | `OpeningsHubView.swift`, `LearnOpeningsView.swift`, `RepertoireView.swift`, `Core/TrainingFeatures.swift`, `Documentation/ENDGAMES.md` | 111 curated opening lessons, saved repertoire and training. Three independently playable opening previews. |
| Endgames / knowledge | `Features/EndgameTrainerView.swift`, `ChessKnowledgeView.swift`, `Documentation/LEARN.md`, `ENDGAMES.md` | 17 endgame training positions highlighted. App also contains 56 fact cards, 22 milestones and historical championship information; these are not presented as a live feed. |
| Reviews / progress | `GameHistoryView.swift`, `StatisticsView.swift`, `AchievementsView.swift`, ratings docs | Reviews, stats and achievements mentioned without invented outcomes, accuracy scores, testimonials or competitive rating claims. |
| Clock | `Features/ChessClockView.swift`, `Core/ChessClock.swift` | Real-board clock with presets/custom controls. Not confused with an online playing clock. |
| Appearance / audio | `Core/AppearanceOptions.swift`, `UI/SettingsView.swift`, classical-music provenance | 12 board palettes, six piece styles, nine themes, quiet piano. Five real board palettes reproduced interactively. |
| Social / privacy | `UI/AppInfoView.swift`, `Services/SocialStore.swift`, `CorrespondenceService.swift`, `PLAYERS_AND_SPECTATING.md` | Offline use needs no account. Optional CloudKit profiles expose public profile data and automatically publish game boards. Game Center correspondence requires configured Apple services. These are not advertised as live website features. |
| Distribution | README, Xcode project, `Documentation/THIRD_PARTY.md`, owner confirmation | App is unreleased; no App Store/TestFlight URL invented. GitHub project and Xcode build instructions are offered. |

## Accuracy decisions

- Do not claim automatic photo reconstruction is reliable. Recognition documentation reports imperfect results.
- Do not call local engine ratings official USCF/Chess.com ratings.
- Do not claim all features are offline: public game imports, social profiles, spectating and correspondence need network/services.
- Do not imply all app data stays private after creating a public profile. Automatic public-game publication is described in the privacy information.
- Do not imply the site runs the native engine or serves multiplayer. Web demonstrations use chess.js.
- Interface artwork is labeled as an illustration. Displayed evaluation/depth is an illustrative UI example, not a live computation.
- No tracking, fabricated signup backend, pricing promise for a future release, or invented store review is added.

## Additional website features

Working puzzle practice, keyboard notation, local-only completion, sandbox move exploration, opening walkthroughs, board theme selection, visual variant navigation, FAQ, prelaunch details and clear privacy/credits. These give visitors useful interaction while keeping the page copy short.
