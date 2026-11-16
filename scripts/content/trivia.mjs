import { readFileSync, writeFileSync } from "node:fs";
import { Chess } from "chess.js";
const entries = JSON.parse(readFileSync("public/data/encyclopedia.json"));
const questions = entries
  .filter(
    (e) =>
      !e.body.toLowerCase().includes(e.title.toLowerCase()) &&
      e.category !== "Openings" &&
      !entries.some((other) => other.id !== e.id && other.body === e.body),
  )
  .map((e, i) => {
    const others = entries.filter(
      (o) => o.category === e.category && o.title !== e.title,
    );
    const wrong = [
      ...new Set(
        others.map((_, j) => others[(j * 7 + i) % others.length].title),
      ),
    ].slice(0, 3);
    return {
      id: e.id,
      prompt:
        {
          Players: "Which player is described here?",
          "Events & history":
            "Which answer matches this moment in chess history?",
          Strategy: "Which strategic idea does this describe?",
          History: "Which part of chess history does this describe?",
          Tactics: "Which tactical idea does this describe?",
        }[e.category] || "Which chess concept does this describe?",
      clue: e.body.split(/(?<=\.)\s/)[0],
      category: e.category,
      answers: [e.title, ...wrong],
      correct: 0,
      explanation: e.body,
      source: e.source,
    };
  })
  .filter((q) => q.answers.length === 4);
const extra = [
  [
    "How many non-attacking eight-queen arrangements exist, counting rotations separately?",
    "92",
    "64",
    "128",
    "256",
  ],
  [
    "Who won the first official world championship in 1886?",
    "Wilhelm Steinitz",
    "Paul Morphy",
    "Emanuel Lasker",
    "Adolf Anderssen",
  ],
  [
    "Which player gave up both rooks and a queen in the 1851 Immortal Game?",
    "Adolf Anderssen",
    "Paul Morphy",
    "Bobby Fischer",
    "Garry Kasparov",
  ],
  [
    "Who played the famous 1991 king walk against Jan Timman?",
    "Nigel Short",
    "Anatoly Karpov",
    "Veselin Topalov",
    "Magnus Carlsen",
  ],
  [
    "Which promotion solves the Saavedra study?",
    "Rook",
    "Queen",
    "Bishop",
    "Knight",
  ],
  [
    "What is the minimum number of queens needed to dominate an empty 8×8 board?",
    "5",
    "4",
    "6",
    "8",
  ],
  [
    "How many square sub-boards of all sizes are on an 8×8 board?",
    "204",
    "64",
    "128",
    "256",
  ],
  [
    "Which champion earned a doctorate in mathematics before winning the title?",
    "Max Euwe",
    "Mikhail Tal",
    "José Raúl Capablanca",
    "Bobby Fischer",
  ],
  [
    "Who became undisputed world champion in 2024?",
    "Gukesh Dommaraju",
    "Ding Liren",
    "Magnus Carlsen",
    "Ian Nepomniachtchi",
  ],
  [
    "Who was Fischer’s opponent in the 1956 Game of the Century?",
    "Donald Byrne",
    "Robert Byrne",
    "Boris Spassky",
    "Samuel Reshevsky",
  ],
  [
    "Which two pieces deliver the standard Arabian mating pattern?",
    "Rook and knight",
    "Queen and bishop",
    "Two bishops",
    "Two knights",
  ],
  [
    "What is the key freeing break for Black in many Sicilian positions?",
    "...d5",
    "...h5",
    "...a5",
    "...g5",
  ],
  [
    "Which side normally benefits from exchanges against an isolated queen’s pawn?",
    "The blockading side",
    "Always the pawn’s owner",
    "Neither side ever",
    "Only the side with a queen",
  ],
  [
    "What distinguishes a Novotny from a Grimshaw theme?",
    "A sacrifice on the interference square",
    "A knight promotion",
    "A forced perpetual check",
    "A pawn-only position",
  ],
  [
    "Which master won the 1858 Opera Game?",
    "Paul Morphy",
    "Wilhelm Steinitz",
    "Adolf Anderssen",
    "Howard Staunton",
  ],
  [
    "Which rook-ending defense uses side attacks against a rook pawn?",
    "Vancura",
    "Lucena",
    "Greek gift",
    "Boden",
  ],
  [
    "Which square color changes on every legal knight move?",
    "The knight always changes color",
    "It always stays on its color",
    "Only on captures",
    "Only on forward moves",
  ],
  [
    "What did Deep Blue achieve against Kasparov in 1997?",
    "Won a six-game match",
    "Won every game",
    "Lost without a draw",
    "Became FIDE champion",
  ],
  [
    "Which federation maintains the international GM title?",
    "FIDE",
    "US Chess alone",
    "The IOC directly",
    "Each online chess site",
  ],
  [
    "Which player used 23...Qg3 against Levitsky in 1912?",
    "Frank Marshall",
    "Akiba Rubinstein",
    "Emanuel Lasker",
    "Alexander Alekhine",
  ],
];
for (const [i, [prompt, answer, ...wrong]] of extra.entries())
  questions.push({
    id: "trivia-extra-" + i,
    prompt,
    category: "Chess knowledge",
    answers: [answer, ...wrong],
    correct: 0,
    explanation: answer,
    source:
      "https://en.wikipedia.org/w/index.php?search=" +
      encodeURIComponent(prompt + " chess"),
  });
writeFileSync(
  "public/data/trivia.json",
  JSON.stringify(questions, null, 2) + "\n",
);
const scenarios = [
  {
    setup: "",
    prompt: "Choose your first move.",
    moves: ["e4", "d4", "Nf3", "c4"],
  },
  {
    setup: "e4 e5 Nf3 Nc6 Bc4 Bc5",
    prompt: "How do you build the position?",
    moves: ["b4", "c3", "d3", "O-O"],
  },
  {
    setup: "d4 Nf6 c4 e6 Nc3 Bb4",
    prompt: "What matters most here?",
    moves: ["e4", "Qc2", "e3", "a3"],
  },
  {
    setup: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3",
    prompt: "Choose Black’s next move.",
    moves: ["g6", "a6", "e6", "Nc6"],
  },
  {
    setup: "e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7",
    prompt: "How do you use your space?",
    moves: ["f4", "Nf3", "Bd3", "a3"],
  },
  {
    setup: "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7",
    prompt: "Pick your next step.",
    moves: ["cxd5", "Qc2", "Bd3", "Rc1"],
  },
].map((s) => {
  const c = new Chess();
  for (const m of s.setup.split(" ").filter(Boolean)) c.move(m);
  for (const m of s.moves) new Chess(c.fen()).move(m);
  return { ...s, fen: c.fen() };
});
writeFileSync(
  "public/data/personality.json",
  JSON.stringify(scenarios, null, 2) + "\n",
);
console.log(
  questions.length,
  "trivia questions,",
  scenarios.length,
  "legal quiz positions",
);
