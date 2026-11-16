import { Chess } from "chess.js";
import { writeFileSync, readFileSync } from "node:fs";
const rows = [];
function add(family, title, line, summary, question, notes) {
  rows.push({ family, title, line, summary, question, notes });
}
add(
  "Italian Game",
  "Opening the center at the right moment",
  "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7 Nbd2 h6 Nf1 Re8 Ng3 Be6 Bc2 d5 exd5 Nxd5 d4 exd4 cxd4 Nf6 Be3 Qd7 a3 Rad8 Rc1 Bd5",
  "Compare the quiet maneuvering phase with the position after ...d5. The same bishop on c2 becomes more useful when central exchanges uncover its diagonal. White accepts an isolated d-pawn in exchange for active pieces; exchanging everything without a plan would help Black.",
  "Black has completed development. Find the central break that challenges e4.",
  [
    [
      "12b",
      "...d5 uses the rook on e8 and developed pieces to challenge e4. Playing this break before preparing it could leave e5 loose.",
    ],
    [
      "13w",
      "exd5 removes the e-pawn from the e-file. The file is not fully open yet: Black still has an e5 pawn, so calculate the next central exchanges.",
    ],
    [
      "14w",
      "d4 spends the tempo gained by the exchanges on central activity. White is not trying to keep the position closed forever.",
    ],
    [
      "16w",
      "Be3 develops the remaining bishop and brings another piece to the defense of d4. Passive protection alone would waste White’s activity.",
    ],
    [
      "15w",
      "cxd4 leaves an isolated d-pawn. It controls c5/e5, but no neighboring pawn can support it; activity must justify that weakness.",
    ],
    [
      "17b",
      "...Rad8 immediately targets the isolated pawn. White’s next task is piece activity and a possible d5 break, not passive pawn defense.",
    ],
  ],
);
add(
  "Ruy Lopez",
  "A closed center and two different wings",
  "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7 Nbd2 Bb7 Bc2 Re8 Nf1 c5 d5 c4 Ng3 Nc5 Be3 Bf8",
  "The center locks after d5. White can use the kingside space and reroute a knight to g3, while Black gains queenside space and a useful c5 square. An attack should follow this structure, not the name of the opening.",
  "White’s queen’s knight has finished supporting e4 from d2. Reroute it toward the kingside.",
  [
    [
      "13w",
      "Nf1 clears d2 and prepares Ng3 without committing another pawn. The rook’s earlier move from f1 to e1 made this route possible.",
    ],
    [
      "13b",
      "...c5 fights for central and queenside space. Black is not obliged to wait for a kingside attack.",
    ],
    [
      "14w",
      "d5 closes the center and takes c6 away from a knight. It also makes a later e4–e5 break a serious commitment.",
    ],
    [
      "14b",
      "...c4 fixes space on the queenside and limits White’s d3 options. This is a structural gain, not a direct attack on the c2 bishop.",
    ],
    [
      "15w",
      "Ng3 eyes f5 and h5. Before jumping there, check whether Black can exchange the knight or open the center.",
    ],
    [
      "16w",
      "Be3 brings the undeveloped bishop into play. Even in a closed position, an attack needs more than the queen and one knight.",
    ],
  ],
);
add(
  "Queen's Gambit Declined",
  "The minority attack, step by step",
  "d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 O-O Bd3 Nbd7 Qc2 Re8 Nge2 Nf8 O-O c6 Rab1 a5 a3 Bd6 b4 axb4 axb4",
  "The Exchange structure creates a practical target on c6. White’s b-pawn advance is meant to create a weakness after b5, not win a pawn immediately. Black should seek active central or kingside play rather than defend the queenside forever.",
  "White wants to prepare b4–b5. Which rook move supports that plan?",
  [
    [
      "11w",
      "Rab1 puts the rook behind the intended b-pawn advance. Moving this rook is safe because White’s king has already castled.",
    ],
    [
      "11b",
      "...a5 tries to stop b4 or change the queenside structure. White must now prepare the break instead of pushing it automatically.",
    ],
    [
      "12w",
      "a3 supports b4. It is useful here because it answers a concrete obstacle created by ...a5.",
    ],
    [
      "13w",
      "b4 begins the minority attack. Calculate the pawn exchanges before deciding which file should open for the rooks.",
    ],
    [
      "14w",
      "axb4 restores a b-pawn after the exchanges. The next b5 break can leave c6 backward or isolated; that is the long-term target.",
    ],
  ],
);
add(
  "Queen's Gambit Accepted",
  "Making central space useful",
  "d4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3 Bb7 a4 b4 Nbd2 Nbd7 e4 cxd4 e5 Nd5 Ne4 Be7",
  "Black returns the c4 pawn for development and queenside play. White’s e4–e5 advance gains a tempo, but also fixes squares that Black can occupy. Keep asking whether the center is mobile, defended and supported by developed pieces.",
  "White has prepared a broad center with Qe2 and Nbd2. Find the central expansion.",
  [
    [
      "11w",
      "e4 uses the queen’s support on the e-file. Advancing it before development would offer Black easier targets.",
    ],
    [
      "11b",
      "...cxd4 attacks the base of the center instead of retreating passively. Black wants White’s central pawns to separate.",
    ],
    [
      "12w",
      "e5 gains time against the f6 knight. The move also abandons control of d5, which Black uses immediately.",
    ],
    [
      "12b",
      "...Nd5 blocks the d4 pawn and occupies a central square. A space advantage does not stop the opponent from finding an outpost.",
    ],
    [
      "13w",
      "Ne4 develops the d2 knight into the space vacated by the e-pawn. White’s pieces must now support the advanced center.",
    ],
  ],
);
add(
  "Sicilian Defense",
  "Opposite-side castling is a race",
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7 g4 b5 g5 b4 Nd5 Nxd5 exd5 Bf5 Bd3 Bxd3 Qxd3 a5",
  "The English Attack combines long castling with a kingside pawn advance. Black counters against the c3 knight and the queenside king. Treat every pawn push as part of a race: a threat that arrives a move late may not matter.",
  "White has castled long and supported e4 with f3. Start the kingside pawn expansion.",
  [
    [
      "11w",
      "g4 gains space and prepares g5 with tempo against the f6 knight. This makes sense because White’s king is on the other wing.",
    ],
    [
      "11b",
      "...b5 is Black’s counterplay, not a waiting move. It prepares ...b4 against a knight that helps defend the king.",
    ],
    [
      "12w",
      "g5 attacks the knight, but White must notice that Black can make a threat of equal urgency.",
    ],
    [
      "12b",
      "...b4 attacks c3 before resolving the knight attack. Calculate both sides’ forcing moves rather than assuming a retreat.",
    ],
    [
      "13w",
      "Nd5 uses the weak d5 square and offers a structural exchange. The c-file is not the only important feature of the Sicilian.",
    ],
    [
      "14w",
      "exd5 opens the e-file and changes the center. White’s former space advantage has turned into lines for the pieces.",
    ],
  ],
);
add(
  "Caro-Kann Defense",
  "Develop the bishop, then attack the chain",
  "e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 O-O Nc6 Be3 cxd4 Nxd4 Nge7 f4 Nxd4 Bxd4 Nc6 Bf2 Be7 Nd2 O-O c3",
  "Black’s light-squared bishop gets outside the pawn chain before ...e6. The next task is to attack d4 with ...c5, rather than remain a tempo behind a French-style setup. White uses e5 as space and as a potential anchor for piece play.",
  "Black’s bishop is already developed. Which pawn break attacks the base of White’s center?",
  [
    [
      "5b",
      "...c5 challenges d4. The c-pawn has moved twice, so Black needs the bishop’s freedom and sound structure to justify the time spent.",
    ],
    [
      "7b",
      "...cxd4 removes the supporting d-pawn and changes the job of White’s pieces. Compare a pawn recapture with a knight recapture.",
    ],
    [
      "8w",
      "Nxd4 puts a piece in the center while keeping e5 fixed. The knight can become a target of exchanges, as the next moves show.",
    ],
    [
      "9w",
      "f4 supports e5, but also commits another kingside pawn. White should not make this move without checking king safety.",
    ],
    [
      "10w",
      "Bxd4 replaces the exchanged knight with an active bishop. White gains activity rather than trying to preserve every minor piece.",
    ],
    [
      "11w",
      "Bf2 preserves the bishop after ...Nc6. It keeps a useful diagonal while letting the other pieces finish development.",
    ],
  ],
);
add(
  "French Defense",
  "Attack the base, then the head",
  "e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 Nh6 b4 cxd4 cxd4 Nf5 Bb2 Be7 Bd3 O-O O-O f6 exf6 Bxf6",
  "The French pawn chain points in different directions for each side. Black attacks d4 with ...c5 and ...Qb6, then challenges e5 with ...f6. White should connect the pieces to the pawn chain before committing to a kingside attack.",
  "Black has castled and is ready to challenge the advanced e5 pawn. Find the second central lever.",
  [
    [
      "11b",
      "...f6 attacks the head of the chain. Black uses this break after arranging development and king safety, not as an automatic first move.",
    ],
    [
      "5b",
      "...Qb6 adds pressure to d4 and b2. White’s next moves must account for both targets.",
    ],
    [
      "7b",
      "...cxd4 releases central tension at a chosen moment. Black should know which piece or pawn will occupy d4 afterward.",
    ],
    [
      "8b",
      "...Nf5 brings the h6 knight toward the central target d4. The edge route had a concrete destination.",
    ],
    [
      "9w",
      "Bb2 develops the bishop along a diagonal opened by b4. The b-pawn advance had a development purpose as well as gaining space.",
    ],
    [
      "12w",
      "exf6 opens the center. White must compare the newly active black bishop with the time spent preserving the pawn chain.",
    ],
  ],
);
add(
  "Nimzo-Indian Defense",
  "The bishop pair versus structural targets",
  "d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O Nc6 a3 Bxc3 bxc3 dxc4 Bxc4 Qc7 Bd3 e5 Qc2 Re8",
  "Black exchanges the b4 bishop only when it changes the structure. White receives the bishop pair and a mobile center. The doubled pawns are not necessarily permanent: Black’s next central exchange removes one of them.",
  "White wants to ask Black’s bishop to decide whether to exchange. Find the useful pawn challenge.",
  [
    [
      "8w",
      "a3 asks the b4 bishop a concrete question. It is not a free tempo: White must be willing to accept the resulting pawn structure.",
    ],
    [
      "8b",
      "...Bxc3 gives up the bishop pair in return for structural change and control of the center.",
    ],
    [
      "9w",
      "bxc3 creates doubled c-pawns for the moment and supports d4. Do not evaluate the structure without looking at the coming exchanges.",
    ],
    [
      "9b",
      "...dxc4 removes the forward c-pawn. Black changes a static weakness into open lines and a new central target.",
    ],
    [
      "10w",
      "Bxc4 restores material and activates the bishop. White’s compensation is now visible in the pieces, not just the pawn count.",
    ],
    [
      "11b",
      "...e5 challenges d4 before the bishops become dominant. Black needs central activity to justify the earlier exchange.",
    ],
  ],
);
add(
  "King's Indian Defense",
  "Which attack arrives first?",
  "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 Be3 f5 f3 f4 Bf2 g5 Nd3 Nf6 Rc1 Ng6 c5 Rf7 cxd6 cxd6 Nb5 Bf8",
  "The locked d5/e4 center makes a queenside plan for White and a kingside plan for Black natural. White cannot spend every move defending, and Black cannot attack forever without checking c5. The race is governed by the pawn structure, not by a universal rule to attack the king.",
  "White needs counterplay while Black’s pawns advance toward the king. Find the queenside break.",
  [
    [
      "15w",
      "c5 attacks d6 and starts opening queenside lines. White uses the c-file before Black’s attack becomes decisive.",
    ],
    [
      "11b",
      "...f4 fixes the kingside structure and gains space. It also removes the immediate possibility of exchanging on e4 with this pawn.",
    ],
    [
      "13w",
      "Nd3 reroutes the e1 knight toward the queenside. Piece placement should follow the wing where your play will occur.",
    ],
    [
      "14w",
      "Rc1 puts a rook behind the coming c5 break. A pawn lever is stronger when a piece is ready to use the file.",
    ],
    [
      "16w",
      "cxd6 changes the target from the original d6 pawn to the pawn that recaptures on d6. White wants entry squares as well as captures.",
    ],
    [
      "17w",
      "Nb5 attacks d6 and pressures the queenside. The knight becomes useful because the central structure gave it a stable route.",
    ],
  ],
);
add(
  "Grünfeld Defense",
  "A mobile center can attack pieces",
  "d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 O-O O-O Nc6 Be3 Bg4 f3 Na5 Bd3 cxd4 cxd4 Be6 d5 Bd7",
  "White’s center is both an asset and a target. The d5 push is strongest when it gains a tempo against a piece, not merely because White has extra space. Black’s pressure from g7 and the c-file makes slow central play risky.",
  "White can advance the center with an attack on the e6 bishop. Find that tempo-gaining push.",
  [
    [
      "14w",
      "d5 attacks the e6 bishop and makes the center mobile. The point is the tempo gained while gaining space.",
    ],
    [
      "7b",
      "...c5 is the main pressure against d4. Black must challenge the center before it simply rolls forward.",
    ],
    [
      "8w",
      "Ne2 keeps the c4 bishop’s diagonal open and helps support d4. Development choices are linked to the pawn center.",
    ],
    [
      "11w",
      "f3 supports e4 but weakens dark squares. White uses it to sustain the center, not as a move to repeat in every opening.",
    ],
    [
      "13w",
      "cxd4 rebuilds the central duo after Black’s exchange. Now the advanced pawns must be coordinated with the pieces.",
    ],
    [
      "14b",
      "...Bd7 preserves the bishop. White has gained space, but the d-pawn may still become a target if it advances without support.",
    ],
  ],
);
add(
  "Catalan Opening",
  "The long diagonal survives a queen trade",
  "d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 a4 Bd7 Qxc4 Bc6 Bg5 Bd5 Qd3 Be4 Qd2 c5 dxc5 Qxd2 Nbxd2 Bxc5",
  "The Catalan bishop can create pressure even when queens disappear. White’s opening choices aim at activity and long-term squares, not a forced mating attack. Black should use a central break before the diagonal becomes too uncomfortable.",
  "Black should challenge the center before White establishes a free e4 advance. Find the freeing break.",
  [
    [
      "12b",
      "...c5 challenges d4 and offers a route toward exchanges. Black addresses the center instead of only defending b7.",
    ],
    [
      "8w",
      "a4 discourages ...b5 from supporting the extra c4 pawn. White is preparing an efficient recovery, not rushing the queen blindly.",
    ],
    [
      "9w",
      "Qxc4 recovers the pawn after the preparatory moves. Notice which bishop gained time from the queen’s journey.",
    ],
    [
      "13w",
      "dxc5 changes the central structure and opens the d-file. White must be ready for the queen trade that follows.",
    ],
    [
      "14w",
      "Nbxd2 develops the queen’s knight while recapturing. An exchange can improve an undeveloped piece instead of making the position passive.",
    ],
    [
      "14b",
      "...Bxc5 restores the pawn and develops the bishop actively. Both sides now judge piece activity rather than an early pawn count.",
    ],
  ],
);
add(
  "Slav Defense",
  "Freeing the bishop without neglecting the center",
  "d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6 e4 O-O e5 Nd5 Bd3 Bxd3 Qxd3 c5",
  "The Slav bishop escapes before ...e6, but that does not solve the whole opening. White gains central space with e4–e5, and Black must return to the d4 target with ...c5. Compare the value of the active bishop with the time needed to keep it safe.",
  "White should stop ...b5 from securing the captured c4 pawn. Find the useful queenside pawn move.",
  [
    [
      "5w",
      "a4 makes ...b5 harder to sustain and prepares recovery of c4. The move answers Black’s extra-pawn plan.",
    ],
    [
      "5b",
      "...Bf5 develops the bishop before ...e6 closes its diagonal. This is a central reason to choose the Slav structure.",
    ],
    [
      "9b",
      "...Bg6 preserves the bishop before White expands with e4. Retreating is useful only if the rest of the development can catch up.",
    ],
    [
      "11w",
      "e5 attacks the f6 knight and gains space. It also gives Black the d5 square, so White cannot treat space as a free advantage.",
    ],
    [
      "13w",
      "Qxd3 recaptures with development and central influence. White’s queen now joins the central plan after the bishop exchange.",
    ],
    [
      "13b",
      "...c5 challenges the base on d4. Black’s freeing break matters more than preserving the original c6–d5 triangle forever.",
    ],
  ],
);
add(
  "Semi-Slav Defense",
  "Calculate before choosing a central pawn break",
  "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3 Bb7 O-O a6 e4 c5 e5 cxd4 Nxb5 axb5 exf6 Nxf6 Bxb5+ Nd7 Nxd4 Bc5 Re1 O-O",
  "The Meran is concrete. White’s e4–e5 advance and Black’s ...c5 break can create a tactical exchange sequence rather than a simple space advantage. Follow every capture before counting the material; intermediate attacks on the king change the order.",
  "Black has prepared the central counterstrike with ...b5, ...Bb7 and ...a6. Find it.",
  [
    [
      "10b",
      "...c5 hits d4 as White takes central space. Black uses prepared development to create active play.",
    ],
    [
      "11w",
      "e5 attacks the f6 knight, but Black has a forcing counter in the center. Always look at captures before assuming the knight must retreat.",
    ],
    [
      "12w",
      "Nxb5 begins a concrete tactical line. Do not copy this sacrifice without calculating the recaptures and checks.",
    ],
    [
      "13w",
      "exf6 removes a knight before the attacking bishop captures on b5. The move order is essential to the material balance.",
    ],
    [
      "14w",
      "Bxb5+ regains the queenside pawn with check. The check buys a tempo to settle the d4 square.",
    ],
    [
      "15w",
      "Nxd4 removes the advanced pawn and places the remaining knight actively. The opening has transformed into a piece-activity contest.",
    ],
  ],
);
add(
  "English Opening",
  "The d5 clamp and a change of center",
  "c4 e5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 e4 f5 Nge2 Nf6 O-O O-O Nd5 Nxd5 cxd5 Ne7 Be3 c6 dxc6 bxc6 Qd2 d5 exd5 cxd5 d4 e4 Rfc1 Be6",
  "The Botvinnik structure controls d5 but leaves d4 as an important break square. When the center opens, White must switch from maneuvering to using files. The g2 bishop changes its strength each time a central pawn moves.",
  "Black wants to challenge White’s center immediately after developing the queen. Find the central break.",
  [
    [
      "13b",
      "...d5 changes the center before White can improve every piece. Black uses the central pawn majority rather than only mirroring moves.",
    ],
    [
      "10w",
      "cxd5 recaptures toward the center and establishes space. White should consider how Black can undermine this pawn later.",
    ],
    [
      "12w",
      "dxc6 releases the d5 clamp in exchange for a new pawn structure. Keeping the advanced pawn forever is not mandatory.",
    ],
    [
      "15w",
      "d4 challenges Black’s center at its base. The move is timely because White has castled and developed the queen.",
    ],
    [
      "15b",
      "...e4 gains space and fixes squares. White should now look for active files rather than trying to restore the old structure.",
    ],
    [
      "16w",
      "Rfc1 uses the newly open c-file. The correct rook is chosen with the other rook’s future queenside duties in mind.",
    ],
  ],
);
add(
  "Scotch Game",
  "An active knight still needs support",
  "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4 Ne5 Be2 Qg6 O-O d6 Nd2 O-O f4 N5c6 N2f3 Bg4 h3 Bxf3 Bxf3 Qh6 Qd2",
  "Opening the center does not finish development. The active d4 knight can be challenged, while the queen’s knight still needs a route into play. Notice how development and the choice of minor-piece exchange prepare a middlegame plan.",
  "White’s d2 knight should join the center now. Find its developing move.",
  [
    [
      "12w",
      "N2f3 brings the d2 knight into play. White does not need another pawn move before improving this piece.",
    ],
    [
      "4w",
      "Nxd4 places a knight in the center and opens lines for both bishops. Black can attack it with ...Bc5 and ...Qf6.",
    ],
    [
      "6w",
      "c3 supports d4 and provides a future central pawn advance. It temporarily removes c3 as a knight square.",
    ],
    [
      "11w",
      "f4 claims space, but also changes the king’s shelter. It is justified by White’s completed castling and central pieces.",
    ],
    [
      "13w",
      "h3 asks the g4 bishop to decide whether the pin is worth preserving. Check the resulting f-file and bishop diagonals before inviting the exchange.",
    ],
    [
      "14w",
      "Bxf3 keeps a bishop active on the kingside after the knight exchange. The bishop can now support central and attacking plans.",
    ],
  ],
);
add(
  "London System",
  "Trade a bishop for a useful structure, not by habit",
  "d4 d5 Nf3 Nf6 Bf4 e6 e3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3 b6 O-O Bb7 Ne5 Ne7 Qe2 Ng6 Nxg6 hxg6 Bxd6 Qxd6 f4",
  "The London’s familiar setup should lead to a concrete decision. Ne5 invites exchanges that can change Black’s kingside pawns. White must decide whether that structure, the bishop exchange and a later f4 plan justify giving up the knight.",
  "White’s pieces support a central outpost. Occupy it with the knight.",
  [
    [
      "10w",
      "Ne5 occupies the square supported by d4. The knight is useful because the pawn structure and pieces support it.",
    ],
    [
      "7w",
      "Bg3 preserves the bishop against the d6 bishop. Exchanging immediately is possible, but White chooses to keep a future option.",
    ],
    [
      "11w",
      "Qe2 joins the central plan and connects the pieces. It is not a substitute for checking Black’s ...Ng6 idea.",
    ],
    [
      "12w",
      "Nxg6 changes Black’s pawn structure after ...hxg6. White voluntarily gives up the e5 knight to gain a different type of target.",
    ],
    [
      "13w",
      "Bxd6 removes the active dark-squared bishop. The choice should be judged together with the knight exchange, not in isolation.",
    ],
    [
      "14w",
      "f4 supports e5 for the remaining knight. White has converted a setup into a specific central plan.",
    ],
  ],
);
add(
  "Scandinavian Defense",
  "Turn queen tempi into real development",
  "e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6 Nd5 Qd8 Nxf6+ gxf6 Qe2 Nd7 O-O-O Nb6 Bd3 Bg6 Kb1 Qc7 c4 O-O-O",
  "White’s attacks on the queen should improve development, not become an endless chase. The illustrative exchanges give Black doubled f-pawns and both sides active pieces. Once the queens retreat, plans concern files, pawn breaks and king safety.",
  "White can develop and attack the exposed queen in one move. Find it.",
  [
    [
      "3w",
      "Nc3 develops with a threat against the queen. This is a useful tempo because the knight wants c3 anyway.",
    ],
    [
      "7w",
      "Bd2 develops the remaining bishop before deciding where to castle. White is preparing a coordinated position, not just another queen attack.",
    ],
    [
      "8w",
      "Nd5 attacks the queen and offers a structural exchange. Check whether the knight can be captured before using this pattern in another position.",
    ],
    [
      "10w",
      "Qe2 develops with central influence and prepares long castling. The queen’s move has a specific follow-up.",
    ],
    [
      "13w",
      "Kb1 improves king safety before the center changes. A quiet king move can be useful when a rook already occupies the d-file.",
    ],
    [
      "14w",
      "c4 challenges the central squares and changes the c-file. Black’s long castling shows why pawn breaks must be judged together with king placement.",
    ],
  ],
);
add(
  "Modern Defense",
  "A broad center must survive a counterstrike",
  "e4 g6 d4 Bg7 Nc3 d6 f4 a6 Nf3 b5 Bd3 Bb7 O-O Nd7 e5 c5 exd6 cxd4 dxe7 Nxe7 Ne4 O-O",
  "The Austrian-style center offers space and attacking chances, but Black’s ...c5 can force a structural decision. White cannot assume that advancing more pawns automatically improves the position. Watch how the g7 bishop and central knights gain scope after exchanges.",
  "Black must challenge the broad pawn center. Find the timely pawn break.",
  [
    [
      "8b",
      "...c5 attacks d4 before White can stabilize every advanced pawn. It is the concrete response to the space disadvantage.",
    ],
    [
      "4w",
      "f4 builds a large center but commits a pawn that also shelters the king. Development and castling must follow.",
    ],
    [
      "8w",
      "e5 gains space and opens questions about d6. The move is a commitment because the pawn can no longer defend d5 from e4.",
    ],
    [
      "9b",
      "...cxd4 answers a flank capture with a central capture. Black should compare both pawn exchanges before recapturing automatically.",
    ],
    [
      "10w",
      "dxe7 removes Black’s e-pawn, but also leaves White’s advanced pawn open to recapture. Count the resulting open diagonals.",
    ],
    [
      "11w",
      "Ne4 uses a square vacated by the e-pawn. White’s central pieces, rather than the original pawn wall, must now provide control.",
    ],
  ],
);
// Further families: use a coherent core line rather than an isolated named sideline.
const extra = [
  [
    "Dutch Defense",
    "Playing around the Stonewall outpost",
    "d4 f5 g3 Nf6 Bg2 e6 Nf3 d5 O-O Bd6 c4 c6 Nc3 O-O Qc2 Qe8 Bf4 Bxf4 gxf4 Qh5 Ne5 Nbd7 e3",
    "The Stonewall grips e4 while conceding e5. White can occupy that hole, but must judge the bishop exchange and the doubled f-pawns together. Black needs an active role for the c8 bishop.",
    "White has a stable square in front of the pawn chain. Find the knight outpost.",
    [
      [
        "10w",
        "Ne5 occupies a square no black d- or f-pawn can attack. Check whether a minor-piece exchange can remove the knight before calling the outpost permanent.",
      ],
      [
        "6w",
        "c4 challenges d5 instead of allowing the Stonewall to remain untouched.",
      ],
      [
        "8w",
        "Bf4 asks Black whether to preserve the attacking bishop. The trade changes which side benefits from opening the center.",
      ],
      [
        "10w",
        "gxf4 accepts doubled f-pawns to open a file and support e5. A damaged structure can have useful dynamic features.",
      ],
      [
        "11w",
        "e3 supports d4 and frees the f1 rook’s second-rank options. White develops around the outpost rather than rushing an unsupported attack.",
      ],
    ],
  ],
  [
    "Alekhine Defense",
    "When space turns into targets",
    "e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6 exd6 cxd6 Nc3 O-O Be3 d5 c5 Bxf3 Bxf3 Nc4",
    "Black invites central advances, then attacks their support. White should make the pieces support the pawns before assuming the extra space is a lasting advantage.",
    "White can gain space while developing with a direct threat against the d5 knight.",
    [
      [
        "7w",
        "c4 attacks the knight and expands the center. Every tempo gained by a pawn also fixes squares the pawn can no longer defend.",
      ],
      [
        "7w",
        "exd6 changes the center rather than trying to keep every advanced pawn.",
      ],
      [
        "9w",
        "Nc3 develops behind the pawn front. Unsupported space would be a target rather than an advantage.",
      ],
      [
        "10b",
        "...d5 challenges the center after castling. Black has waited until development makes the break active.",
      ],
      [
        "12b",
        "...Nc4 finds a forward square created by White’s c-pawn advance. Calculate captures before treating the outpost as safe.",
      ],
    ],
  ],
  [
    "Petrov's Defense",
    "Symmetry does not mean inactivity",
    "e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Bd6 O-O O-O c4 c6 Nc3 Nxc3 bxc3 dxc4 Bxc4 Nd7 Re1 Nf6",
    "Early exchanges produce a balanced center, but open files and development still create plans. White challenges d5 and activates a rook; Black exchanges a central knight and completes development.",
    "White can increase pressure on d5 with a pawn break.",
    [
      [
        "8w",
        "c4 puts immediate pressure on d5. A symmetrical opening can still require concrete central decisions.",
      ],
      [
        "8w",
        "Nc3 develops with pressure against the e4 knight. White wants piece activity to support the pawn challenge.",
      ],
      [
        "10w",
        "bxc3 changes the structure and reinforces d4. Do not judge doubled pawns without considering their central role.",
      ],
      [
        "10w",
        "Bxc4 restores the pawn while activating a bishop. Development is part of the recapture choice.",
      ],
      [
        "11w",
        "Re1 uses the open e-file. An active file gives the rook a job even when the material is equal.",
      ],
    ],
  ],
  [
    "Vienna Game",
    "Meet a flank gambit with a central break",
    "e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d3 Nxc3 bxc3 O-O Be2 c5 O-O Nc6 Qe1 Be6 Qg3 Kh8",
    "The f-pawn advance increases attacking space but gives Black a central counterstrike. This example shows why ...d5 should be calculated before Black tries to hold the e5 pawn.",
    "Black can strike in the center immediately after f4.",
    [
      [
        "3b",
        "...d5 challenges e4 before White organizes a kingside attack. The counterstrike addresses the opening’s central tension.",
      ],
      [
        "4w",
        "fxe5 gains a pawn for the moment, but Black can use the exposed center instead of recapturing immediately.",
      ],
      [
        "4w",
        "Nf3 develops and contests e5. White needs pieces to support the advanced pawn.",
      ],
      [
        "7w",
        "bxc3 restores material after the knight exchange and opens the b-file. The pawn structure now shapes the middlegame.",
      ],
      [
        "10w",
        "Qe1 prepares a kingside queen route, but White should verify the center and king safety before committing to an attack.",
      ],
    ],
  ],
  [
    "Four Knights Game",
    "A developing move can be a central tactic",
    "e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O O-O Bg5 c6 Qf3 Be7",
    "The Scotch structure opens the center early. Black uses ...d5 to challenge a developing bishop, and both sides must settle the pawn structure before maneuvering.",
    "Black can challenge White’s center after Bd3. Find the freeing pawn move.",
    [
      [
        "7b",
        "...d5 challenges e4 and opens lines for the c8 bishop. Black should not drift passively in a symmetrical setup.",
      ],
      [
        "4w",
        "Nxd4 develops actively, but the knight can be exchanged before it becomes a permanent outpost.",
      ],
      [
        "6w",
        "Nxc6 changes Black’s pawn structure. The resulting c-pawn can later recapture toward the center.",
      ],
      [
        "8w",
        "exd5 releases central tension. White should compare the isolated-pawn and hanging-pawn possibilities after the recapture.",
      ],
      [
        "10w",
        "Bg5 develops with pressure. A pin is useful when it supports a plan, not simply because it can be made.",
      ],
    ],
  ],
  [
    "Tarrasch Defense",
    "How to use an isolated d-pawn",
    "d4 d5 c4 e6 Nc3 c5 cxd5 exd5 Nf3 Nc6 g3 Nf6 Bg2 Be7 O-O O-O Bg5 cxd4 Nxd4 h6 Be3 Re8 Rc1 Bf8",
    "The isolated d5 pawn gives Black space and open files. White tries to blockade and exchange active pieces; Black should develop threats or prepare ...d4 before the position becomes a passive ending.",
    "White can blockade the isolated pawn while recapturing centrally.",
    [
      [
        "10w",
        "Nxd4 places the knight directly in front of d5. This is a blockade and an active developing square at once.",
      ],
      [
        "4b",
        "...exd5 accepts a structure that can become isolated after the c-pawn exchange. Black is choosing activity in return.",
      ],
      [
        "6w",
        "g3 prepares the bishop to add pressure on d5 from g2. The fianchetto has a concrete target.",
      ],
      [
        "10w",
        "Be3 preserves the bishop after ...h6. White should keep control of the blockade square while deciding which exchanges favor the structure.",
      ],
      [
        "12b",
        "...Bf8 preserves the bishop and supports the king. Black must still seek active files or the ...d4 break rather than just defend the pawn.",
      ],
    ],
  ],
  [
    "King's Gambit Accepted",
    "Development before recovering the pawn",
    "e4 e5 f4 exf4 Nf3 d6 d4 g5 h4 g4 Ng1 Bh6 Nc3 Nf6 Nge2 Nh5 Qd3 Nc6 Bd2 O-O O-O-O",
    "The Fischer Defense makes holding f4 a concrete choice. White spends time with the king’s knight but tries to open lines and castle long; Black develops to use the central and kingside weaknesses.",
    "White wants a broad center before trying to recover f4.",
    [
      [
        "4w",
        "d4 claims space and frees the c1 bishop. White should develop before spending several queen moves on the extra pawn.",
      ],
      [
        "4w",
        "h4 attacks Black’s supporting g-pawn. It can open lines toward either king, so the follow-up must be calculated.",
      ],
      [
        "6w",
        "Ng1 is a real retreat, not a model developing move. White accepts that cost to avoid losing the knight after ...g4.",
      ],
      [
        "8w",
        "Nge2 brings the knight back into play and keeps castling long possible.",
      ],
      [
        "10w",
        "O-O-O finally connects the rooks. The opening’s material investment must now become activity.",
      ],
    ],
  ],
  [
    "Queen's Indian Defense",
    "Contesting e4 with pieces",
    "d4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 Ne4 Qc2 Nxc3 Qxc3 d5 cxd5 exd5 Bf4 c6 Rac1",
    "Black controls e4 with the knight and b7 bishop instead of occupying it with a pawn. White’s development and central exchanges decide whether the long diagonals will favor one bishop or the other.",
    "Black can occupy the square the b7 bishop and f6 knight have been contesting.",
    [
      [
        "7b",
        "...Ne4 occupies the central square before White plays e4. Check whether the knight has support and a useful retreat before using the same idea elsewhere.",
      ],
      [
        "8w",
        "Qc2 attacks e4 and helps organize the central plan. The queen move should improve more than one piece’s coordination.",
      ],
      [
        "8w",
        "Qxc3 recaptures without doubled pawns and keeps the queen active. It also gives Black a target for developing moves.",
      ],
      [
        "10w",
        "cxd5 changes which diagonals are open. White should compare the recapturing pawn’s squares before exchanging.",
      ],
      [
        "11w",
        "Rac1 uses the file opened by the c-pawn exchanges. Development should adapt to the new structure.",
      ],
    ],
  ],
  [
    "Bogo-Indian Defense",
    "A bishop check changes the development choice",
    "d4 Nf6 c4 e6 Nf3 Bb4+ Bd2 Bxd2+ Qxd2 O-O Nc3 d5 e3 b6 Bd3 Bb7 O-O Nbd7 Rac1 c5 cxd5 exd5",
    "Black’s check leads to a bishop exchange rather than a direct attack. White gains a clear developing scheme, while Black prepares a central break and a long diagonal for the remaining bishop.",
    "White should answer the check with a useful developing block.",
    [
      [
        "4w",
        "Bd2 blocks the check and offers a trade. It avoids committing the queen’s knight to a particular blocking square.",
      ],
      [
        "4w",
        "Qxd2 recaptures without moving the king. White’s next task is to develop the knights and castle.",
      ],
      [
        "7b",
        "...b6 opens a route for the c8 bishop. Black must give the remaining bishop an active job after exchanging the other one.",
      ],
      [
        "10w",
        "Rac1 prepares for central exchanges and the c-file. The rook move has a target structure in mind.",
      ],
      [
        "10b",
        "...c5 challenges d4 and begins active play. A sound opening is not permission to keep every pawn fixed.",
      ],
    ],
  ],
  [
    "Benoni Defense",
    "A backward pawn and active counterplay",
    "d4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 Nf3 Bg7 Be2 O-O O-O Re8 Nd2 Na6 f3 Nc7 a4 b6 Nc4 Ba6",
    "White’s center gives space, while Black’s d6 pawn can become backward. Black uses queenside squares and the g7 bishop to create counterplay before the weakness can simply be attacked.",
    "White wants to support e4 and move the f3 knight to c4. Start the rerouting plan.",
    [
      [
        "10w",
        "Nd2 supports e4 and prepares a route to c4. White uses the space advantage to improve a piece before advancing more pawns.",
      ],
      [
        "4w",
        "cxd5 creates the characteristic space advantage. The d5 pawn also leaves e5 and c5 as important squares to monitor.",
      ],
      [
        "8b",
        "...Re8 uses a semi-open file and adds pressure to e4. Black’s compensation is active piece play.",
      ],
      [
        "11w",
        "a4 restrains ...b5. This matters because Black’s queenside pawn break is a main source of counterplay.",
      ],
      [
        "13w",
        "Nc4 reaches a square that pressures d6. White’s earlier maneuver now has a clear target.",
      ],
    ],
  ],
  [
    "Benko Gambit Accepted",
    "The extra pawn comes with defensive duties",
    "d4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 g6 Nc3 Bxa6 g3 d6 Bg2 Bg7 Nf3 O-O O-O Nbd7 Qc2 Qa5 Rd1 Rfb8 Rb1",
    "White keeps an extra pawn while Black obtains lasting pressure on the a- and b-files. Queen exchanges do not automatically remove the compensation; the rooks and g7 bishop can keep the queenside tied down.",
    "White needs to defend the queenside against the rook on b8. Put a rook behind b2.",
    [
      [
        "13w",
        "Rb1 defends b2 and prepares to meet pressure on the b-file. The extra pawn requires active defensive coordination.",
      ],
      [
        "4w",
        "cxb5 accepts the gambit. White should understand the resulting open files before deciding the pawn can be kept comfortably.",
      ],
      [
        "7w",
        "g3 prepares king safety and a bishop that can contest long-diagonal pressure.",
      ],
      [
        "11b",
        "...Qa5 creates concrete queenside targets. Black is building pressure rather than looking only for immediate material recovery.",
      ],
      [
        "12b",
        "...Rfb8 brings another heavy piece to the queenside. Black’s rooks need the open files to justify the pawn investment.",
      ],
    ],
  ],
  [
    "Philidor Defense",
    "Prepare the break before releasing tension",
    "e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Re1 c6 a4 Qc7 h3 h6 Be3 Re8 Qd2 Bf8 Rad1 exd4 Nxd4 Nc5",
    "Black’s compact center gives few weaknesses but less room. The pieces must be ready to use a central exchange; otherwise White can keep improving behind a stable space advantage.",
    "Black has developed and prepared the center. Release the tension on d4.",
    [
      [
        "12b",
        "...exd4 opens the e-file only after Black’s rook is ready on e8. The timing matters more than keeping the original pawn chain.",
      ],
      [
        "7w",
        "Re1 supports e4 and prepares central play. White develops a rook before making additional pawn commitments.",
      ],
      [
        "8b",
        "...Qc7 reinforces e5 and connects the queenside plan. Black is preparing to improve the cramped pieces.",
      ],
      [
        "10w",
        "Be3 develops with central influence rather than an immediate speculative attack.",
      ],
      [
        "13b",
        "...Nc5 finds an active square for the d7 knight after the exchanges. A freeing break should improve the pieces as well as the pawns.",
      ],
    ],
  ],
  [
    "Queen's Pawn Game",
    "The Colle only makes sense if e4 arrives",
    "d4 d5 Nf3 Nf6 e3 e6 Bd3 c5 c3 Nc6 Nbd2 Bd6 O-O O-O Re1 e5 dxe5 Nxe5 Nxe5 Bxe5 e4 dxe4 Nxe4",
    "The Colle’s triangle is preparation for e4, not an end in itself. Black can play ...e5 first, so White must calculate the exchanges and use the rook’s support rather than repeat a setup mechanically.",
    "White has prepared the e-file and exchanged central pieces. Play the thematic break.",
    [
      [
        "10w",
        "e4 opens lines for the bishops and rook. This is the purpose of the earlier compact setup.",
      ],
      [
        "6w",
        "Nbd2 supports e4 without blocking the c-pawn. The knight’s placement follows the intended break.",
      ],
      [
        "8w",
        "Re1 adds support to e4 before the center opens. The move is useful because a concrete pawn break follows.",
      ],
      [
        "8w",
        "dxe5 answers Black’s central expansion by exchanging before advancing. White must see where the pieces will recapture.",
      ],
      [
        "11w",
        "Nxe4 recaptures actively and centralizes the remaining knight. The original triangle has transformed into piece activity.",
      ],
    ],
  ],
  [
    "Neo-Grünfeld Defense",
    "Delay the knight, keep the center flexible",
    "d4 Nf6 c4 g6 Nf3 Bg7 g3 d5 Bg2 O-O O-O dxc4 Na3 c3 bxc3 c5 e3 Nc6 Qe2 Qa5 Bb2 cxd4 cxd4",
    "White delays Nc3 and chooses a fianchetto structure. This avoids some Exchange Grünfeld positions, but Black still challenges the center with ...d5 and ...c5. Development must fit the actual move order.",
    "Black should challenge the center after the queenside pawn exchanges. Find the main pawn break.",
    [
      [
        "8b",
        "...c5 attacks d4 and gives the pieces central targets. The delayed white knight changes tactics but not the need for counterplay.",
      ],
      [
        "7w",
        "Na3 develops while keeping c3 available for a pawn recapture. This is a move-order choice, not a general claim that edge knights are best.",
      ],
      [
        "8w",
        "bxc3 restores material and supports d4. White accepts a changed queenside structure for central control.",
      ],
      [
        "10w",
        "Qe2 supports the center and develops the queen before the pawn structure settles.",
      ],
      [
        "11w",
        "cxd4 rebuilds the center after Black’s exchange. White should now compare the bishop diagonals and the isolated central targets.",
      ],
    ],
  ],
];
for (const r of extra) add(...r);
const guides = JSON.parse(readFileSync("public/data/opening-guides.json"));
const data = rows.map((r) => {
  if (!guides.some((g) => g.family === r.family))
    throw Error("Unknown family " + r.family);
  const c = new Chess();
  for (const san of r.line.split(" "))
    try {
      c.move(san);
    } catch (e) {
      throw Error(r.family + " " + san + ": " + e.message);
    }
  const history = c.history({ verbose: true }),
    notes = r.notes.map(([at, text]) => {
      const n = parseInt(at);
      let ply = (n - 1) * 2 + (at.endsWith("w") ? 1 : 2);
      if (ply > history.length) throw Error(r.family + " invalid note " + at);
      const stated = text
        .split(" ")[0]
        .replace(/^\.\.\./, "")
        .replace(/[+#]/g, "");
      if (stated !== history[ply - 1].san.replace(/[+#]/g, "")) {
        const candidates = history
          .map((m, i) => ({ m, ply: i + 1 }))
          .filter(
            (x) =>
              x.m.color === (at.endsWith("w") ? "w" : "b") &&
              x.m.san.replace(/[+#]/g, "") === stated,
          )
          .sort((a, b) => Math.abs(a.ply - ply) - Math.abs(b.ply - ply));
        if (!candidates.length)
          throw Error(r.family + " note has no move " + stated);
        ply = candidates[0].ply;
      }
      return { ply, san: history[ply - 1].san, text };
    }),
    challenge = notes[0].ply - 1,
    position = new Chess();
  for (const m of history.slice(0, challenge)) position.move(m.san);
  const correct =
      history[challenge].from +
      history[challenge].to +
      (history[challenge].promotion || ""),
    alternatives = position
      .moves({ verbose: true })
      .filter((m) => m.from + m.to + (m.promotion || "") !== correct)
      .sort((a, b) => Number(!!b.captured) - Number(!!a.captured))
      .slice(0, 2)
      .map((m) => ({ uci: m.from + m.to + (m.promotion || ""), san: m.san }));
  return {
    family: r.family,
    title: r.title,
    summary: r.summary,
    question: r.question,
    moves: history.map((m) => m.from + m.to + (m.promotion || "")),
    notes: notes.sort((a, b) => a.ply - b.ply),
    challenge,
    answers: [{ uci: correct, san: history[challenge].san }, ...alternatives],
  };
});
if (data.length !== 32) throw Error("Expected all 32 families");
writeFileSync(
  "public/data/opening-workbooks.json",
  JSON.stringify(data, null, 2) + "\n",
);
console.log(
  data.length,
  "annotated middlegame studies,",
  data.reduce((s, c) => s + c.notes.length, 0),
  "position notes and",
  data.length,
  "decision drills",
);
