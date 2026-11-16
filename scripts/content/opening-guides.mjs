import { Chess } from "chess.js";
import { readFileSync, writeFileSync } from "node:fs";
// Original instructional text; conventional opening move sequences.
const rows = [
  [
    "Italian Game",
    "C50",
    "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7 Nbd2 h6 Nf1 Re8 Ng3 Be6 Bc2 d5",
    "Build d4 without rushing it. The c4 bishop points at f7, but a prepared center break is usually more useful than a one-piece attack.",
    "c3 supports d4; d3 keeps the center stable until the pieces are ready.",
    "Reroute Nb1–d2–f1–g3; use Re1 to support e4; time d4 after castling.",
    "Challenge the center with ...d5; develop the c8 bishop before closing its diagonal; watch the f7 battery.",
    "d4 / ...d5",
    "Do not play Ng5 just because f7 looks weak: ...d5 can hit the bishop and open the center.",
    "Why play c3 before d4?",
    "To support the central break",
    "To attack the king immediately",
    "To exchange queens",
    [
      [
        "Two Knights",
        "e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 c3 d6 O-O O-O Re1 a6 Bb3 Ba7 Nbd2 h6",
      ],
      [
        "Evans Gambit",
        "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d6 cxd4 Bb6",
      ],
    ],
  ],
  [
    "Ruy Lopez",
    "C84",
    "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7 Nbd2 Bb7 Bc2 Re8",
    "Pressure e5 indirectly. White often preserves the bishop and builds a center while Black gains queenside space.",
    "A closed center gives both sides time to maneuver; opening it changes which pieces are strong.",
    "Protect e4 with Re1; prepare d4 with c3; reroute the queen’s knight toward the kingside.",
    "Complete development before ...d5; use ...c5 for central pressure; do not weaken dark squares for a bishop chase alone.",
    "d4 / ...d5 / ...c5",
    "After 3.Bb5, taking c6 does not simply win e5: Black often has a queen move with a double attack.",
    "What is the purpose of Re1?",
    "Defend e4 and support d4",
    "Force an immediate exchange",
    "Move the king again",
    [
      [
        "Exchange",
        "e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1",
      ],
      [
        "Berlin",
        "e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8 Kxd8",
      ],
    ],
  ],
  [
    "Queen's Gambit Declined",
    "D35",
    "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7 O-O Nxc3 Rxc3 e5",
    "Use pressure on d5 to choose a favorable pawn structure. Black is solid but must solve the c8 bishop.",
    "After cxd5 exd5, White’s queenside minority can target c6; keeping central tension leaves more options.",
    "Develop before pushing e4; consider cxd5 only with a plan; use the c-file after it opens.",
    "Free the c8 bishop with ...b6 or ...e5; time ...c5; exchange a cramped minor piece.",
    "cxd5 / e4 / ...c5 / ...e5",
    "Releasing the center without a follow-up can solve Black’s development for free.",
    "Which Black piece often needs a plan?",
    "The c8 bishop",
    "The already-developed king’s knight",
    "The queen on d8 alone",
    [
      [
        "Exchange",
        "d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 O-O Bd3 Nbd7 Qc2 Re8 Nge2 Nf8",
      ],
      [
        "Tartakower",
        "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7",
      ],
    ],
  ],
  [
    "Queen's Gambit Accepted",
    "D27",
    "d4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3 Bb7 Rd1 Nbd7 Nc3 Bd6 e4 cxd4 Nxd4",
    "Black gives up the center temporarily for development and a later ...c5 break. Holding c4 at all costs is unnecessary.",
    "White’s d4–e4 center gains space, but can become a target after exchanges.",
    "Recover c4 efficiently; develop before e4; use the open files if the d-pawn becomes isolated.",
    "Return the extra pawn when needed; strike d4 with ...c5; develop the bishop to b7 or e7.",
    "e4 / ...c5",
    "Trying to keep c4 with ...b5 before preparation can let a4 undermine the pawn chain.",
    "Why does Black usually play ...c5?",
    "Challenge White’s central space",
    "Keep the extra pawn forever",
    "Trade both bishops immediately",
    [
      [
        "Central expansion",
        "d4 d5 c4 dxc4 e4 e5 Nf3 exd4 Bxc4 Nc6 O-O Be6 Bxe6 fxe6",
      ],
      [
        "Quiet development",
        "d4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O Nc6 Qe2 a6 Rd1",
      ],
    ],
  ],
  [
    "Sicilian Defense",
    "B50",
    "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6 Qd2 Nbd7 Rad1 Qc7 a4 Rac8",
    "The c-pawn exchange gives Black a semi-open c-file and a central pawn majority. White gets quick development and space.",
    "White’s d-pawn has disappeared; the d5 square can become an outpost if Black plays ...e5.",
    "Develop with a concrete plan; use d5 when it is permanent; consider f4 or a kingside attack only after king safety.",
    "Create counterplay on the c-file; prepare ...d5; watch d6 and d5 when playing ...e5.",
    "...d5 / f4 / ...b5",
    "A kingside pawn storm is not automatic: castling on the same side changes the risk.",
    "Which central break often frees Black?",
    "...d5",
    "...h5 in every position",
    "...a5 without development",
    [
      [
        "Dragon",
        "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7",
      ],
      [
        "Sveshnikov",
        "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5 Be7",
      ],
    ],
  ],
  [
    "Caro-Kann Defense",
    "B18",
    "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bd2 Ngf6 O-O-O Be7",
    "Black develops the light-squared bishop before ...e6. White’s space is useful only if it becomes activity.",
    "The c6 pawn supports d5; ...c5 challenges the center later but costs a second c-pawn move.",
    "Use space to develop quickly; compare long castling with king safety; control e5.",
    "Finish kingside development; challenge d4 with ...c5; make sure the bishop has a retreat after h4–h5.",
    "...c5 / ...e5",
    "A bishop trapped on g6 can turn a sound setup into a tactical problem.",
    "Why bring the bishop out before ...e6?",
    "Avoid trapping it behind the pawn chain",
    "Win a pawn by force",
    "Prevent White from castling",
    [
      [
        "Advance",
        "e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 O-O Nc6 Be3 cxd4 Nxd4 Nge7",
      ],
      [
        "Panov",
        "e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Bb4 Bd3 dxc4 Bxc4 O-O",
      ],
    ],
  ],
  [
    "French Defense",
    "C11",
    "e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3 a6 Qd2 b5 a3 Qb6 Ne2 c4 c3 a5 g3 Be7",
    "Attack the base of the pawn chain, not just its head. Black pressures d4; White often uses the kingside space.",
    "The locked e5–d4 versus e6–d5 chains direct attacks to opposite wings.",
    "Support d4; prepare f5 with pieces; judge whether the d4 base can survive before attacking.",
    "Use ...c5 and ...f6 to undermine the chain; find a role for the c8 bishop; counter in the center before White’s attack lands.",
    "...c5 / ...f6 / f5",
    "Exchanging c5 too early can remove pressure from the d4 pawn.",
    "Which pawn is the base of White’s chain?",
    "d4",
    "e5",
    "h2",
    [
      [
        "Winawer",
        "e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7 Nf3 Nbc6",
      ],
      ["Tarrasch", "e4 e6 d4 d5 Nd2 c5 exd5 exd5 Ngf3 Nc6 Bb5 Bd6 O-O Nge7"],
    ],
  ],
  [
    "Nimzo-Indian Defense",
    "E32",
    "d4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 b6 Bg5 Bb7 e3 d6 Nf3 Nbd7 Be2 h6 Bh4 c5 O-O",
    "Black trades a bishop to slow e4 and influence the center. White chooses between clean pawns and faster development.",
    "Bxc3 can double White’s c-pawns; Qc2 avoids that but spends a queen tempo.",
    "Use the bishop pair if the position opens; build e4 carefully; watch c4 if the c-pawns are doubled.",
    "Challenge c4 and e4; choose ...d5 or ...c5 according to structure; do not trade the bishop without gaining something.",
    "e4 / ...c5 / ...d5",
    "The bishop pair is a long-term asset, not permission to neglect development.",
    "What does 4.Qc2 often prevent?",
    "Doubled c-pawns after Bxc3",
    "All possible checks",
    "Black from castling",
    [
      [
        "Rubinstein",
        "d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O Nc6 a3 Bxc3 bxc3 dxc4 Bxc4",
      ],
      ["Sämisch", "d4 Nf6 c4 e6 Nc3 Bb4 a3 Bxc3+ bxc3 c5 e3 Nc6 Bd3 O-O Ne2"],
    ],
  ],
  [
    "King's Indian Defense",
    "E97",
    "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 Be3 f5 f3 f4 Bf2 g5",
    "White owns central space; Black accepts less room to seek a kingside pawn break. Speed matters when attacks run on opposite wings.",
    "Once d5 locks the center, White tends toward c5 and Black toward ...f5–f4.",
    "Seek queenside play with c5; keep enough kingside defenders; prevent a pawn avalanche from arriving with tempo.",
    "Prepare ...f5 without losing e5; reroute knights behind the pawns; use the locked center to protect the king.",
    "c5 / ...f5",
    "Copying the kingside attack before the center is closed may expose Black’s own king.",
    "Why can Black push kingside pawns in the locked center?",
    "Central lines are harder to open quickly",
    "The king no longer needs defense",
    "Queens are always exchanged",
    [
      [
        "Fianchetto",
        "d4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 c6 h3",
      ],
      ["Sämisch", "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 Nc6 Nge2 a6 Qd2 Rb8"],
    ],
  ],
  [
    "Grünfeld Defense",
    "D85",
    "d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Rb1 O-O Be2 cxd4 cxd4 Qa5+ Bd2 Qxa2 O-O",
    "Black invites a broad center, then attacks it from a distance. White’s task is to make the center mobile before it becomes a target.",
    "The c3 pawn becomes d4’s support after bxc3; exchanges can leave an isolated central pawn.",
    "Develop before chasing queens; use d5 when tactically sound; protect the base of the center.",
    "Combine ...c5, ...Bg7 and queen pressure on d4; calculate before grabbing queenside pawns.",
    "d5 / ...c5",
    "Winning a pawn with the queen can concede too many development tempos.",
    "What is Black attacking?",
    "The large white pawn center",
    "Only the h-pawn",
    "The castled king immediately",
    [
      [
        "Classical exchange",
        "d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 O-O O-O Nc6",
      ],
      [
        "Russian system",
        "d4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3 dxc4 Qxc4 O-O e4 Bg4 Be3",
      ],
    ],
  ],
  [
    "Catalan Opening",
    "E04",
    "d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 a4 Bd7 Qxc4 Bc6 Bg5 Bd5 Qd3 Be4 Qd2",
    "The g2 bishop creates long-term queenside pressure. White can recover c4 without rushing if development compensates.",
    "The long diagonal matters most when the center opens; a closed d5 pawn can blunt the bishop.",
    "Use the bishop on the long diagonal; prepare e4; recover c4 without wasting development.",
    "Choose whether to hold c4 or complete development; use ...c5 to equalize central space; watch b7.",
    "e4 / ...c5",
    "An automatic queen chase for c4 may cost the initiative that justified the opening.",
    "Which piece gives the Catalan its long-term pressure?",
    "The g2 bishop",
    "The a1 rook before development",
    "The king on g1",
    [
      ["Closed", "d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6 Nbd2 b6"],
      ["Open", "d4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 O-O Nc6 e3 Bd7 Qe2"],
    ],
  ],
  [
    "Slav Defense",
    "D17",
    "d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6 e4 O-O e5 Nd5",
    "Black keeps the light-squared bishop free before ...e6. White often plays a4 to stop ...b5 from holding c4.",
    "The c6–d5 chain is solid, but c6 can become a target if Black falls behind.",
    "Recover the c4 pawn with development; use e4 for central space; stop ...b5 when it would secure the extra pawn.",
    "Develop Bf5 or Bg4 before ...e6; time ...c5; avoid moving the same bishop repeatedly without cause.",
    "e4 / ...c5",
    "Playing ...Bf5 too early in some move orders allows Qb3 pressure on b7.",
    "What is the point of a4 in this line?",
    "Discourage ...b5 from holding c4",
    "Force checkmate",
    "Make a rook lift immediately",
    [
      [
        "Quiet Slav",
        "d4 d5 c4 c6 Nf3 Nf6 e3 Bf5 Nc3 e6 Bd3 Bxd3 Qxd3 Nbd7 O-O",
      ],
      ["Exchange", "d4 d5 c4 c6 cxd5 cxd5 Nc3 Nf6 Nf3 Nc6 Bf4 Bf5 e3 e6"],
    ],
  ],
  [
    "Semi-Slav Defense",
    "D46",
    "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3 Bb7 O-O a6 e4 c5 e5 cxd4 Nxb5 axb5",
    "Black combines a solid triangle with a prepared ...c5 break. White can use the center before Black’s queenside develops fully.",
    "After ...dxc4 and ...b5, the c8 bishop finds b7 and Black hits the center with ...c5.",
    "Decide whether e4 is safe; calculate central breaks before retreating; avoid opening lines toward an uncastled king.",
    "Prepare ...c5 with development; use the b7 bishop actively; return material if it frees the position.",
    "e4 / e5 / ...c5",
    "The apparently quiet pawn triangle can lead to forcing tactics; do not treat the Meran as a setup to copy blindly.",
    "Why does Black play ...b5?",
    "Gain time on the bishop and prepare ...Bb7",
    "Trap White’s queen",
    "Prevent all central breaks",
    [
      ["Anti-Meran", "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Qc2 Bd6 b3 O-O Bb2"],
      ["Early bishop", "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 h6 Bh4 dxc4 e4 g5 Bg3"],
    ],
  ],
  [
    "English Opening",
    "A25",
    "c4 e5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 e4 f5 Nge2 Nf6 O-O O-O Nd5 Nxd5 cxd5 Ne7 Be3 c6 dxc6 bxc6",
    "Use c4 to control d5 and choose a central structure later. The first move does not commit White to a single pawn formation.",
    "A Botvinnik structure with c4–d3–e4 grips d5 but leaves d4 as a square to watch.",
    "Control d5; develop the g2 bishop; choose d4 or f4 according to Black’s setup.",
    "Challenge the center with ...d5 or ...f5; use d4 if White fixes e4; complete development before expanding.",
    "d4 / f4 / ...d5",
    "A symmetrical position is not automatically quiet: one central break can create an isolated pawn or open diagonal.",
    "Which square does c4 immediately control?",
    "d5",
    "f7",
    "h8",
    [
      [
        "Symmetrical",
        "c4 c5 Nf3 Nf6 Nc3 Nc6 g3 g6 Bg2 Bg7 O-O O-O d4 cxd4 Nxd4",
      ],
      [
        "Reversed Sicilian",
        "c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7",
      ],
    ],
  ],
  [
    "Scotch Game",
    "C45",
    "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4 Ne5 Be2 Qg6 O-O d6 Nd2 O-O f4 N5c6",
    "Open the center early and develop with tempo. The d4 knight is active but can become a target.",
    "With both central d-pawns exchanged or challenged, piece activity matters more than a closed pawn chain.",
    "Develop the queen’s bishop; meet pressure on d4 accurately; use central files after castling.",
    "Hit d4 with pieces; develop quickly rather than cling to d4; use ...d5 when it gains time.",
    "...d5 / f4",
    "Moving the queen too early can invite developing attacks against it.",
    "What changes after 3.d4?",
    "The center opens early",
    "The position is permanently locked",
    "Black cannot develop a bishop",
    [
      [
        "Four knights",
        "e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3 d5",
      ],
      ["Mieses", "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5"],
    ],
  ],
  [
    "London System",
    "D02",
    "d4 d5 Nf3 Nf6 Bf4 e6 e3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3 b6 O-O Bb7 Ne5 Ne7 Qe2",
    "Develop the bishop before closing the e-pawn chain, but adapt to Black’s central and queenside pressure.",
    "The d4–e3–c3 triangle supports e5 and keeps the center stable.",
    "Support Ne5; use e4 if prepared; answer ...Qb6 without losing b2 or d4.",
    "Challenge d4 with ...c5; exchange the f4 bishop when useful; use ...Qb6 to make White solve concrete problems.",
    "e4 / ...c5",
    "The London is not an autopilot setup: early ...Qb6 and ...Nh5 require specific replies.",
    "Why develop Bf4 before e3?",
    "Keep it outside the pawn chain",
    "Win a rook immediately",
    "Stop ...c5 by force",
    [
      ["Early c5", "d4 Nf6 Bf4 c5 e3 Qb6 Nc3 Qxb2 Nb5 Nd5 Rb1 Qxa2"],
      ["Quiet setup", "d4 d5 Bf4 Nf6 e3 e6 Nf3 Bd6 Bxd6 Qxd6 c4 O-O Nc3"],
    ],
  ],
  [
    "Scandinavian Defense",
    "B01",
    "e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6 Nd5 Qd8 Nxf6+ gxf6 Qe2 Nd7 O-O-O",
    "Black trades the d-pawn and develops the queen early. White gains time by attacking it while developing.",
    "The c6–e6 structure supports d5; White has more space but must turn it into active pieces.",
    "Develop with tempo; use central space; avoid queen chases that leave your own pieces undeveloped.",
    "Find a safe queen square; develop Bf5 or Bg4 before ...e6; prepare ...c5.",
    "d5 / ...c5",
    "A queen attack is only useful if the developing move also improves your position.",
    "What makes 3.Nc3 useful?",
    "Development with an attack on the queen",
    "It wins the queen by force",
    "It prevents castling permanently",
    [
      ["Queen retreat", "e4 d5 exd5 Qxd5 Nc3 Qd8 d4 Nf6 Nf3 Bg4 Be2 e6 O-O"],
      ["Knight recapture", "e4 d5 exd5 Nf6 d4 Nxd5 Nf3 g6 c4 Nb6 Nc3 Bg7"],
    ],
  ],
  [
    "Modern Defense",
    "B06",
    "e4 g6 d4 Bg7 Nc3 d6 Be3 a6 Qd2 b5 f3 Nd7 Nh3 Bb7 Nf2 c5 d5 Ngf6 Be2 O-O O-O",
    "Black delays the king’s knight and invites a broad center. Flexibility is valuable only if the center is challenged in time.",
    "White has a d4–e4 center; Black’s ...c5 or ...e5 break determines the middlegame.",
    "Develop before launching pawns; keep d4 supported; open the center if Black’s king is unsafe.",
    "Choose the right central break; use the g7 diagonal; do not let White expand for free.",
    "...c5 / ...e5",
    "Queenside expansion without central pressure can leave Black strategically squeezed.",
    "What must Black eventually challenge?",
    "White’s central pawns",
    "Only the a-file",
    "The opponent’s clock",
    [
      ["Classical", "e4 g6 d4 Bg7 Nf3 d6 Be2 Nf6 Nc3 O-O O-O Nc6"],
      ["Austrian center", "e4 g6 d4 Bg7 Nc3 d6 f4 a6 Nf3 b5 Bd3 Bb7"],
    ],
  ],
];
const guides = rows.map(
  ([
    family,
    eco,
    line,
    idea,
    structure,
    white,
    black,
    breaks,
    avoid,
    question,
    answer,
    wrong1,
    wrong2,
    branches,
  ]) => {
    const parse = (score) => {
      const c = new Chess();
      for (const san of score.split(/\s+/))
        try {
          c.move(san);
        } catch {
          throw new Error(family + " illegal " + san + " " + c.fen());
        }
      return c
        .history({ verbose: true })
        .map((m) => m.from + m.to + (m.promotion || ""));
    };
    return {
      id:
        "foundation-" +
        family
          .toLowerCase()
          .replace(/[^a-z]+/g, "-")
          .replace(/-$/, ""),
      family,
      eco,
      idea,
      structure,
      white: white.split("; "),
      black: black.split("; "),
      breaks: breaks.split(" / "),
      avoid,
      quiz: {
        question,
        answers: [answer, wrong1, wrong2],
        correct: 0,
        explanation: idea,
      },
      lines: [
        { name: "Main line", moves: parse(line) },
        ...branches.map(([name, score]) => ({ name, moves: parse(score) })),
      ],
    };
  },
);
const old = JSON.parse(readFileSync("public/data/lessons.json"));
const originals = old.filter((x) => !x.id.startsWith("foundation-"));
const lessons = [
  ...guides.map((g) => ({
    id: g.id,
    eco: g.eco,
    name: g.family + ": Core plans",
    moves: g.lines[0].moves,
  })),
  ...originals,
];
writeFileSync(
  "public/data/lessons.json",
  JSON.stringify(lessons, null, 2) + "\n",
);
writeFileSync(
  "public/data/opening-guides.json",
  JSON.stringify(guides, null, 2) + "\n",
);
console.log(
  guides.length,
  "guides,",
  guides.reduce((n, g) => n + g.lines.length, 0),
  "playable branches,",
  lessons.length,
  "lessons",
);
