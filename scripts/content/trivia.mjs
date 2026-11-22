import { readFileSync, writeFileSync } from "node:fs";
const entries = JSON.parse(readFileSync("public/data/encyclopedia.json"));
const plainQuestions = {
  skewer: "What is it called when you attack a valuable piece so that moving it exposes a piece behind it?",
  "discovered-attack": "What is it called when moving one piece reveals an attack by another piece behind it?",
  "double-check": "What is it called when two pieces give check at the same time?",
  deflection: "What is it called when you lure a defender away from the piece or square it protects?",
  overloading: "What is it called when one piece has too many things to defend?",
  interference: "What is it called when you block the line between an enemy piece and the piece it protects?",
  novotny: "What is the name of a sacrifice on a square where a rook and bishop can both capture, but either capture blocks the other piece?",
  grimshaw: "What is the name of a chess problem in which a rook and bishop can each move to the same square and block the other?",
  plachutta: "What is the name of a sacrifice on a square where two pieces that move the same way, such as two rooks, can each capture and block the other?",
  clearance: "What is it called when you free up a square or open a line so another piece can use it?",
  zwischenzug: "What is it called when you play an unexpected move, such as a check, before making the obvious recapture?",
  desperado: "What do you call a piece that takes something or creates a threat just before it is lost?",
  windmill: "What is it called when repeated discovered checks let you take pieces between checks?",
  "x-ray-attack": "What is it called when a bishop, rook, or queen attacks a target through a piece in the way?",
  undermining: "What is it called when you attack the piece or pawn that protects your real target?",
  "back-rank-mate": "What is it called when a rook or queen mates a king trapped on its starting rank by its own pieces?",
  "smothered-mate": "What is it called when a knight mates a king whose own pieces block every escape?",
  "arabian-mate": "Which mating pattern uses a rook and knight to trap a king in a corner?",
  "dovetail-mate": "Which mate uses a queen one diagonal square from the king, with the king’s own pieces blocking its two straight retreats?",
  "swallow-s-tail-mate": "Which mate uses a queen right beside the king, with the king’s own pieces blocking its two diagonal retreats?",
  "perpetual-check": "What is it called when one side can give check again and again and the other side cannot get away?",
  battery: "What do you call two pieces lined up to attack along the same file, rank, or diagonal?",
  rundlauf: "What is the name of a chess problem in which a piece makes a loop and returns to its starting square by a different route?",
  switchback: "What is it called when a piece retraces its move and returns to its starting square?",
  excelsior: "What is the name of a chess problem in which a pawn starts on its original square and plays all the way to promotion?",
  "babson-task": "What is the name of a mate problem in which White must match whichever of the four pieces Black promotes to?",
  allumwandlung: "What is the name of a chess problem whose solutions show all four promotion choices?",
  outpost: "What do you call an advanced square where a piece can sit without being chased away by enemy pawns?",
  prophylaxis: "What do you call playing a move to prevent your opponent’s plan before they can carry it out?",
  "minority-attack": "What is it called when you advance fewer pawns against a larger group of pawns to create a weakness?",
  "isolated-queen-s-pawn": "What do you call a pawn on the d-file with no friendly pawn on either neighboring file?",
  "hanging-pawns": "What do you call two side-by-side pawns that have no other friendly pawns to defend them?",
  "backward-pawn": "What do you call a pawn that has fallen behind its neighbors and cannot safely advance?",
  "color-complex": "What do you call a group of light squares or dark squares you can attack or defend together?",
  "exchange-sacrifice": "What is it called when you deliberately give up a rook for a bishop or knight?",
  "pawn-break": "What do you call a pawn move that challenges the opponent’s pawn chain and can open lines?",
  "principle-of-two-weaknesses": "What is the strategy of creating a second target far from the first so your opponent has to defend both?",
  "transformation-of-advantage": "What is it called when you trade one advantage for another, such as giving up an attack to enter a winning endgame?",
  "rook-lift": "What do you call bringing a rook up from the back rank so it can move sideways and join the attack?",
};
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
      prompt: plainQuestions[e.id] ??
        {
          Players: "Who is this chess player?",
          "Events & history":
            "What event is this clue about?",
          Strategy: "What is this strategy called?",
          History: "What is this clue about?",
          Tactics: "What is this tactic called?",
        }[e.category] ?? "What is this called?",
      clue: plainQuestions[e.id] ? undefined : e.body.split(/(?<=\.)\s/)[0]
        .replace(/: (classical \/ unified|FIDE split-era) world title\.$/, "."),
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
    "How many ways can you place eight queens so none attacks another? Count rotations and reflections separately.",
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
    "In the Saavedra puzzle, what piece should the winning pawn promote to?",
    "Rook",
    "Queen",
    "Bishop",
    "Knight",
  ],
  [
    "What is the fewest queens you can place so every square is occupied or attacked?",
    "5",
    "4",
    "6",
    "8",
  ],
  [
    "How many squares of all sizes can you count on a chessboard, from 1×1 to 8×8?",
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
    "Which two pieces work together in an Arabian mate?",
    "Rook and knight",
    "Queen and bishop",
    "Two bishops",
    "Two knights",
  ],
  [
    "Which pawn move often helps Black open up the position in the Sicilian Defense?",
    "...d5",
    "...h5",
    "...a5",
    "...g5",
  ],
  [
    "Who usually benefits from trading pieces when one player has an isolated d-pawn?",
    "The player blocking the pawn",
    "Always the pawn’s owner",
    "Neither side ever",
    "Only the side with a queen",
  ],
  [
    "What does a Novotny chess problem add that a Grimshaw does not?",
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
    "Which rook endgame defense uses checks or attacks from the side against a pawn on the a- or h-file?",
    "Vancura",
    "Lucena",
    "Greek gift",
    "Boden",
  ],
  [
    "What happens to the square color each time a knight moves?",
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
    "Which organization awards the international Grandmaster title?",
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
const factQuestions=JSON.parse(readFileSync(new URL("./fact-trivia.json",import.meta.url),"utf8"));
for(const q of factQuestions) if(!questions.some(existing=>existing.prompt===q.prompt)) questions.push(q);
writeFileSync(
  "public/data/trivia.json",
  JSON.stringify(questions, null, 2) + "\n",
);
console.log(questions.length, "trivia questions");
