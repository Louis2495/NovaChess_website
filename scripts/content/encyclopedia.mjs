import { readFileSync, writeFileSync } from "node:fs";
import {Chess} from "chess.js";
import {expandedEntries} from "./encyclopedia-expanded.mjs";
import {foundationEntries} from "./encyclopedia-foundations.mjs";
const groups = {
  Tactics: [
    [
      "Fork",
      "One piece attacks two or more targets at once. Check whether one target can move with check or create a stronger threat before assuming the fork wins material.",
      "Double attack",
    ],
    [
      "Pin",
      "Moving a pinned piece exposes a more valuable target behind it. An absolute pin exposes the king and makes such a move illegal; a relative pin may be ignored tactically.",
      "Absolute pin;Relative pin",
    ],
    [
      "Skewer",
      "A valuable front piece is attacked along a line; when it moves, a target behind it is lost. Unlike a pin, the more valuable piece stands in front.",
      "X-ray",
    ],
    [
      "Discovered attack",
      "A moving piece uncovers an attack by a bishop, rook or queen behind it. The moving piece may create a second threat at the same time.",
      "Discovery",
    ],
    [
      "Double check",
      "Both the moving piece and an uncovered piece give check. Capturing or blocking only one attacker does not answer both checks, so a legal reply must move the king.",
      "Discovered check",
    ],
    [
      "Deflection",
      "A defender is lured away from an important square or duty. Identify what becomes undefended after the forced response.",
      "Decoy",
    ],
    [
      "Attraction",
      "A piece is drawn onto a particular square where a second tactic works. Deflection emphasizes leaving a duty; attraction emphasizes the destination.",
      "Decoy sacrifice",
    ],
    [
      "Overloading",
      "One defender has more tasks than it can maintain. Force it to perform one duty, then exploit the task it abandons.",
      "Overworked defender",
    ],
    [
      "Interference",
      "A move blocks an enemy line of defense or attack. Sacrificing on the crossing point of two defensive lines can create two different winning responses.",
      "Line blocking",
    ],
    [
      "Novotny",
      "A sacrifice on the intersection of two differently moving line pieces creates interference whichever piece captures. It is a classic problem theme that can also occur in games.",
      "Interference sacrifice",
    ],
    [
      "Grimshaw",
      "Two defending line pieces interfere with one another on the same square in different variations, without an initial sacrifice on that square. It is most often seen in composed problems.",
      "Mutual interference",
    ],
    [
      "Plachutta",
      "A sacrifice creates mutual interference between two similarly moving line pieces. Because either piece can capture, their duties must be carefully separated by the follow-up.",
      "Line interference",
    ],
    [
      "Clearance",
      "A square or line is vacated so another piece can use it. The clearing move may be a sacrifice, a check, or a quiet move that gains time.",
      "Clearance sacrifice",
    ],
    [
      "Zwischenzug",
      "An in-between move interrupts an expected sequence, often a recapture. Forcing checks and threats can change the material balance before normal play resumes.",
      "Intermezzo;In-between move",
    ],
    [
      "Desperado",
      "A piece that will be lost anyway captures or creates a threat before disappearing. Its final action extracts value from an otherwise doomed position.",
      "Doomed piece",
    ],
    [
      "Windmill",
      "A repeated discovered-check mechanism lets an attacking piece collect material between checks. The defending king is forced back to a square that permits the next cycle.",
      "Seesaw",
    ],
    [
      "X-ray attack",
      "A line piece influences a target through an intervening piece that may move or be exchanged. X-ray defense can make an apparently loose piece tactically safe.",
      "X-ray defense",
    ],
    [
      "Undermining",
      "The supporting pawn or piece beneath a target is attacked. Capturing the support can make the main target collapse even when it has several direct defenders.",
      "Removing the defender",
    ],
    [
      "Back-rank mate",
      "A rook or queen mates a king confined by its own pawns or pieces on the back rank. Giving the king luft can help, but only if the escape square is actually safe.",
      "Luft",
    ],
    [
      "Smothered mate",
      "A knight mates a king whose own pieces occupy all escape squares. A queen sacrifice often forces the final blocking piece into place.",
      "Philidor’s legacy",
    ],
    [
      "Arabian mate",
      "A rook and knight coordinate against a king near a corner. The knight protects the rook and covers a key escape square.",
      "Rook and knight mate",
    ],
    [
      "Anastasia’s mate",
      "A rook or queen checks along an edge while a knight seals escape squares, often with an enemy pawn blocking the remaining route. The name comes from an early nineteenth-century novel.",
      "Mating pattern",
    ],
    [
      "Boden’s mate",
      "Two bishops on crossing diagonals mate a king trapped by its own pieces, often after queenside castling. A sacrifice can open the decisive diagonal.",
      "Criss-cross mate",
    ],
    [
      "Greek gift",
      "A bishop sacrifice on h7 or h2 draws the king out so a knight and queen can attack. It is sound only if the attacking pieces can arrive and the king cannot safely escape.",
      "Bxh7 sacrifice",
    ],
    [
      "Legal’s mate",
      "A pinned knight moves to allow a queen capture, while minor pieces force mate. The pattern works only when the defender actually accepts the poisoned queen.",
      "Légal trap",
    ],
    [
      "Epaulette mate",
      "A queen mates a king whose two sideways escape squares are blocked by its own pieces. The blocking pieces resemble shoulder decorations.",
      "Mating net",
    ],
    [
      "Dovetail mate",
      "A queen checks a diagonally adjacent king while friendly pieces block the king’s rear diagonal escapes. The queen itself must be protected.",
      "Cozio’s mate",
    ],
    [
      "Swallow’s-tail mate",
      "The checking queen stands immediately beside the king, and the king’s pieces block diagonal retreats on the other side. Exact geometry distinguishes it from the dovetail.",
      "Mating pattern",
    ],
    [
      "Underpromotion",
      "A pawn promotes to a rook, bishop or knight rather than a queen. Reasons include avoiding stalemate, giving a knight fork, or delivering a specific mate.",
      "Promotion",
    ],
    [
      "Perpetual check",
      "One side can keep giving checks that the opponent cannot escape without unacceptable loss. The actual draw follows repetition or another rule, rather than a separate perpetual-check rule.",
      "Repetition",
    ],
    [
      "Domination",
      "One piece controls all useful destinations of an opposing piece. A trapped knight or bishop may be lost without being directly attacked yet.",
      "Trapped piece",
    ],
    [
      "Quiet move",
      "A move that is neither check nor capture can make an unavoidable threat. Candidate-move calculation must include quiet moves when forcing checks fail.",
      "Silent move",
    ],
    [
      "Cross-check",
      "A check is answered by blocking it with a piece that itself gives check. The idea appears in tactical games and composed problems.",
      "Counter-check",
    ],
    [
      "Battery",
      "Two coordinated line pieces share a file, rank or diagonal. The front piece can move to uncover the rear attacker, or one piece can support the other’s entry.",
      "Queen-bishop battery",
    ],
    [
      "Rundlauf",
      "A piece travels a circuit and returns to its starting square, while the position has changed in a useful way. The theme is especially common in chess composition.",
      "Round trip",
    ],
    [
      "Switchback",
      "A piece moves to a square and later returns to its original square, often after forcing a weakening response. The return is purposeful rather than simply lost time.",
      "Return move",
    ],
    [
      "Excelsior",
      "A pawn travels from its starting rank to promotion during a composed solution. The named theme originated in a problem by Sam Loyd.",
      "Composition",
    ],
    [
      "Babson task",
      "A direct-mate composition answers each of Black’s four promotion choices with the corresponding White promotion. Leonid Yarosh’s 1983 orthodox setting was a landmark.",
      "Allumwandlung",
    ],
    [
      "Allumwandlung",
      "A composed solution or its variations feature all four promotion types. It need not have the matching-response structure of a Babson task.",
      "Four promotions",
    ],
  ],
  Strategy: [
    [
      "Hole",
      "A weak square cannot be defended by an appropriate pawn because those pawns have advanced, disappeared or become fixed. A hole matters most when an enemy piece can occupy it securely.",
      "Weak square",
    ],
    [
      "Outpost",
      "A secure advanced square supports a piece, often a knight, without easy challenge by enemy pawns. A square is less useful if the piece has no targets from it.",
      "Knight outpost",
    ],
    [
      "Prophylaxis",
      "Anticipate the opponent’s useful plan and limit it while improving your position. It is not simply passive defense: the best prophylactic moves often serve two purposes.",
      "Preventive play",
    ],
    [
      "Minority attack",
      "Fewer pawns advance against a larger pawn group to create a fixed weakness, commonly b4–b5 against c6 in the Carlsbad structure. The aim is a target, not necessarily a passed pawn.",
      "Carlsbad structure",
    ],
    [
      "Isolated queen’s pawn",
      "An isolated d-pawn has no adjacent friendly pawn to support it. Its owner gets space and active pieces; a blockade and exchanges favor the defender.",
      "IQP;Isolani",
    ],
    [
      "Hanging pawns",
      "Adjacent pawns on open neighboring files, often c4 and d4, support each other but cannot be defended by other pawns. Their strength depends on activity and well-timed advances.",
      "Dynamic pawn pair",
    ],
    [
      "Backward pawn",
      "A pawn lags behind neighboring pawns and cannot safely advance. It is especially vulnerable on an open or semi-open file.",
      "Pawn weakness",
    ],
    [
      "Good bishop / bad bishop",
      "A bishop blocked by its own fixed pawns is conventionally “bad,” but it may still defend important squares. Judge activity and useful targets, not only pawn colors.",
      "Bad bishop",
    ],
    [
      "Color complex",
      "A network of squares of one color can become weak after pawn moves or a bishop exchange. An attack may exploit that network without targeting a single fixed square.",
      "Weak color complex",
    ],
    [
      "Exchange sacrifice",
      "A rook is given for a bishop or knight to gain positional or tactical compensation. Typical returns include a permanent outpost, damaged pawns, or a dangerous king attack.",
      "Quality sacrifice",
    ],
    [
      "Blockade",
      "A piece occupies a square directly in front of an enemy pawn, preventing its advance. Knights are often effective blockaders because they attack beyond the blocked pawn.",
      "Blockader",
    ],
    [
      "Space advantage",
      "Advanced pawns control territory and restrict the opponent’s maneuvering. The cramped side often seeks exchanges or a freeing pawn break.",
      "Cramped position",
    ],
    [
      "Pawn break",
      "A pawn move challenges an opposing pawn chain and changes the available files or diagonals. Preparation matters because the resulting structure may favor either side.",
      "Lever",
    ],
    [
      "Candidate passed pawn",
      "A pawn may become passed after a favorable exchange or breakthrough. It is a potential resource, unlike a pawn that is already free of opposing pawns ahead on adjacent files.",
      "Passed pawn",
    ],
    [
      "Outside passed pawn",
      "A passed pawn far from the main pawn mass can distract the enemy king. Its value depends on whether the other side gains a more dangerous central passer or attack.",
      "Decoy passer",
    ],
    [
      "Initiative",
      "One side makes threats that force the opponent to respond, controlling the direction of play. The initiative can disappear if a threat is harmless or a defender finds a counterattack.",
      "Tempo",
    ],
    [
      "Compensation",
      "Material loss is balanced by activity, king exposure, space or structural gains. Compensation can be temporary; identify whether it must become a concrete result.",
      "Dynamic balance",
    ],
    [
      "Principle of two weaknesses",
      "A defender may hold one target but struggle when a second target is created far away. Switching play can overload a tied-down defense.",
      "Two fronts",
    ],
    [
      "Transformation of advantage",
      "A temporary edge can be converted into a different lasting asset, such as exchanging an attack for a favorable endgame. Keeping the original advantage forever is not always possible.",
      "Conversion",
    ],
    [
      "Rook lift",
      "A rook develops along a rank before moving to another file, often joining a kingside attack through the third rank. Check the central squares it must cross.",
      "Third-rank attack",
    ],
  ],
  "Endgame Lessons": [
    [
      "Opposition",
      "Kings separated by one square contest entry squares. Direct opposition is only one tool: distant opposition, pawn moves and the position of the board edges can change the result.",
      "King opposition",
    ],
    [
      "Triangulation",
      "A king or other piece takes a three-move route to return to a useful position with the opponent to move. The aim is to transfer the move without losing the position.",
      "Losing a tempo",
    ],
    [
      "Corresponding squares",
      "Pairs of squares dictate where a defender must stand to answer an attacking king. Opposition is a simple special case; more complex pawn endgames require a wider map.",
      "Coordinate squares",
    ],
    [
      "Lucena position",
      "A rook and pawn on the seventh rank can win by building a bridge against checking attacks. The attacking rook shields its king so the pawn can promote.",
      "Building a bridge",
    ],
    [
      "Philidor position",
      "The defending rook holds the third rank while the enemy pawn remains behind it, then switches to rear checks after the pawn advances. Exact king and pawn placement matter.",
      "Third-rank defense",
    ],
    [
      "Vancura defense",
      "Against a rook pawn, a defending rook can attack the pawn from the side while keeping checking distance. The defending king must avoid being forced away from the corner.",
      "Rook-pawn defense",
    ],
    [
      "Short-side defense",
      "In rook endings, the defending king often belongs on the short side of the pawn, leaving the rook room to check from the long side. Too little checking distance can lose.",
      "Long-side checks",
    ],
    [
      "Fortress",
      "The weaker side builds a position the stronger side cannot penetrate despite a material advantage. A claimed fortress must survive waiting moves, pawn breaks and zugzwang.",
      "Impenetrable position",
    ],
    [
      "Zugzwang",
      "Every legal move worsens the position, so having the turn is harmful. It is common in king-and-pawn endings but also occurs with many pieces.",
      "Compulsion to move",
    ],
    [
      "Trebuchet",
      "A reciprocal-zugzwang king-and-pawn position: each king protects its own pawn while attacking the opponent’s. Whoever moves must give ground.",
      "Reciprocal zugzwang",
    ],
    [
      "Rook behind the passer",
      "A rook behind a passed pawn usually gains scope as the pawn advances. This is a useful guideline, not a rule: immediate tactics and checking geometry can override it.",
      "Tarrasch rule",
    ],
    [
      "Shouldering",
      "A king uses its body to prevent the enemy king from approaching along the shortest route. The maneuver can gain a decisive tempo in a pawn race.",
      "King obstruction",
    ],
    [
      "Tablebase",
      "An exact database classifies supported low-material positions under specified rules. Distance-to-mate and distance-to-zeroing measure different things, and move-count rules can change a practical result.",
      "DTM;DTZ",
    ],
    [
      "Saavedra position",
      "A famous pawn study wins through rook underpromotion to avoid stalemate. Promoting to the strongest piece would throw away the win.",
      "Rook underpromotion",
    ],
    [
      "Réti study",
      "A king simultaneously approaches a hostile passer and supports its own pawn. Diagonal movement lets it pursue two goals without losing as much time as a straight-line chase.",
      "King geometry",
    ],
  ],
  "Rules & competition": [
    [
      "En passant",
      "Immediately after a pawn advances two squares, an opposing pawn beside it may capture it as if it had advanced one. The capture is illegal if it exposes the capturing side’s king.",
      "Passing capture",
    ],
    [
      "Castling",
      "The king moves two squares toward a rook, which crosses to the square beside it. Neither piece may have moved; the king cannot be in check, cross check, or finish in check.",
      "O-O;O-O-O",
    ],
    [
      "Threefold repetition",
      "A player can claim a draw when the same position occurs three times with the same side to move and the same legal possibilities. Castling and en-passant rights can make similar-looking positions different.",
      "Repetition claim",
    ],
    [
      "Fifty-move rule",
      "A player can claim a draw after fifty moves by each side without a pawn move or capture. The automatic seventy-five-move rule is a separate limit; checkmate on the last move takes precedence.",
      "Move-count draw",
    ],
    [
      "Swiss tournament",
      "Players with similar scores are paired over a fixed number of rounds without a complete round-robin. Pairing constraints and tie-breaks influence final standings.",
      "Swiss system",
    ],
    [
      "Round-robin tournament",
      "Every participant plays every other participant, once or multiple times. A double round-robin gives each player both colors against each opponent.",
      "All-play-all",
    ],
    [
      "Candidates tournament",
      "The challenger-selection event in the modern world-championship cycle. Formats have varied across history, including matches and round-robin tournaments.",
      "World-title qualifier",
    ],
    [
      "Elo rating",
      "A relative estimate of playing strength updated from results and expected scores. A higher rating is not a guarantee of winning an individual game.",
      "Expected score",
    ],
    [
      "FIDE",
      "The international chess federation organizes championships and maintains international ratings and titles. Federation ratings differ from online-site ratings.",
      "World Chess Federation",
    ],
    [
      "US Chess",
      "The United States federation maintains its own ratings and member records. Its rating pool and rules are distinct from FIDE’s, so the numbers are not directly interchangeable.",
      "USCF",
    ],
    [
      "Grandmaster",
      "A FIDE title usually earned through rating and norm requirements, with exceptions for designated events. It is a title, not a temporary rating category.",
      "GM",
    ],
    [
      "PGN",
      "Portable Game Notation stores game headers and algebraic move text, with optional comments and variations. It describes a game score rather than just a single board position.",
      "Portable Game Notation",
    ],
    [
      "FEN",
      "Forsyth–Edwards Notation describes piece placement, side to move, castling rights, en-passant square and move counters. Two positions with identical pieces can have different legal moves.",
      "Forsyth–Edwards Notation",
    ],
    [
      "Chess960",
      "A randomized starting arrangement keeps bishops on opposite colors and the king between the rooks. Castling ends with the same king and rook destinations as in standard chess.",
      "Fischer Random",
    ],
    [
      "Touch-move",
      "In over-the-board play, deliberately touching a movable own piece normally commits the player to move it. Announcing an adjustment before touching distinguishes correcting a piece’s placement.",
      "J’adoube",
    ],
  ],
};
let entries = [];
for (const [category, rows] of Object.entries(groups))
  for (const [title, body, aliases] of rows)
    entries.push({
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title,
      body,
      category,
      aliases: aliases.split(";"),
      source:
        "https://en.wikipedia.org/w/index.php?search=" +
        encodeURIComponent(title + " chess"),
    });
const learning = JSON.parse(readFileSync("public/data/learning.json"));
for (const c of learning.champions)
  entries.push({
    id: "player-" + c.id,
    title: c.name,
    category: "Players",
    body: `${c.highlight} ${c.start}${c.end ? "–" + c.end : ""}: ${c.track === "main" ? "classical / unified" : "FIDE split-era"} world title.`,
    aliases: ["World champion"],
    source: c.source,
  });
for (const m of learning.milestones)
  entries.push({
    id: "event-" + m.id,
    title: m.title,
    category: "Events & history",
    body: m.year + ": " + m.detail,
    aliases: [String(m.year)],
    source: m.source,
  });
const guides = JSON.parse(readFileSync("public/data/opening-guides.json"));
for (const g of guides)
  entries.push({
    id: "opening-" + g.id,
    title: g.family,
    category: "Openings",
    body: g.idea + " " + g.structure,
    sections:[{title:"White's plans",body:g.white.join(" ")},{title:"Black's plans",body:g.black.join(" ")},{title:"Common mistake",body:g.avoid}],
    aliases: [g.eco, ...g.breaks],
    source:
      "https://en.wikipedia.org/w/index.php?search=" +
      encodeURIComponent(g.family),
    lesson: g.id,
  });
const allOpenings = JSON.parse(readFileSync("public/data/openings.json"));
for (const o of allOpenings) {
  if (entries.some((e) => e.title === o.name)) continue;
  const board=new Chess();
  for(const move of o.moves)board.move(move);
  const family=guides.filter(g=>o.name.toLowerCase().startsWith(g.family.toLowerCase())).sort((a,b)=>b.family.length-a.family.length)[0];
  entries.push({
    id: "opening-line-" + o.id,
    title: o.name,
    category: "Openings",
    body: `${o.name} is classified as ${o.eco}. ${family?family.idea:"The move order below defines this named line. Compare the resulting central structure, development, and king safety before choosing a continuation."}`,
    sections:[{title:"Defining move order",body:board.pgn()},...(family?[{title:"Plans and pawn structure",body:family.structure+" White: "+family.white.join(" ")+" Black: "+family.black.join(" ")},{title:"Watch for",body:family.avoid}]:[])],
    aliases: [o.eco],
    source:
      "https://en.wikipedia.org/w/index.php?search=" +
      encodeURIComponent(o.name),
    lesson: o.id,
  });
}
const masters = JSON.parse(readFileSync("public/data/famous-games.json"));
for (const g of masters) {
  for (const player of [g.white, g.black]) {
    if (entries.some((e) => e.title === player) || player.includes("/"))
      continue;
    entries.push({
      id: "master-" + player.toLowerCase().replace(/[^a-z]+/g, "-"),
      title: player,
      category: "Players",
      body: `Featured in ${g.title}, ${g.event} ${g.year}. ${g.intro}`,
      aliases: [g.event, String(g.year)],
      source: g.source,
    });
  }
}
// Expand existing articles in place so saved IDs and aliases keep working.
const key=title=>title.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
for(const article of [...expandedEntries,...foundationEntries]){
 const existing=entries.find(e=>key(e.title)===key(article.title));
 if(existing)Object.assign(existing,{body:article.body,sections:article.sections});
 else entries.push(article);
}
writeFileSync(
  "public/data/encyclopedia.json",
  JSON.stringify(entries, null, 2) + "\n",
);
console.log(entries.length, "encyclopedia entries");
