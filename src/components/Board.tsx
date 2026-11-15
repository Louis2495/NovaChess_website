import { useEffect, useState, type DragEvent } from "react";
import { Chess } from "chess.js";
import { useApp } from "../lib/context";
import { base, pieceUrl } from "../lib/store";
import { squares } from "../lib/variants";
import { Modal } from "./UI";
export function Piece({ symbol, style }: { symbol: string; style?: string }) {
  const { appearance } = useApp();
  if (symbol === "*")
    return (
      <img
        className="piece duck-piece"
        src={`${base}duck.webp`}
        alt=""
        draggable={false}
      />
    );
  return (
    <img
      className="piece"
      src={pieceUrl(
        `${symbol === symbol.toUpperCase() ? "w" : "b"}${symbol.toUpperCase()}`,
        style || appearance.pieceStyle,
      )}
      alt=""
      draggable={false}
    />
  );
}
const names: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
  "*": "duck",
};
export function Board({
  fen,
  onMove,
  onSquare,
  legalMoves,
  flipped = false,
  disabled = false,
  hidden = false,
  visible,
  highlights = [],
  hint,
  selected: externalSelected,
  compact = false,
}: {
  fen: string;
  onMove?: (from: string, to: string, promotion?: string) => void;
  onSquare?: (square: string) => void;
  legalMoves?: string[];
  flipped?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  visible?: Set<string>;
  highlights?: string[];
  hint?: string;
  selected?: string | null;
  compact?: boolean;
}) {
  const { appearance, notify } = useApp();
  const [selected, setSelected] = useState<string | null>(null),
    [promotion, setPromotion] = useState<{
      from: string;
      to: string;
      choices: string[];
    } | null>(null);
  const cells = squares(fen),
    turn = fen.split(" ")[1];
  useEffect(() => {
    setSelected(null);
    setPromotion(null);
  }, [fen]);
  let moves = legalMoves;
  if (!moves) {
    try {
      moves = new Chess(fen)
        .moves({ verbose: true })
        .map((m) => m.from + m.to + (m.promotion || ""));
    } catch {
      moves = [];
    }
  }
  const files = flipped ? "hgfedcba" : "abcdefgh";
  const ranks = flipped ? "12345678" : "87654321";
  const active = externalSelected ?? selected;
  const targets = active
    ? moves.filter((m) => m.startsWith(active)).map((m) => m.slice(2, 4))
    : [];
  function choose(from: string, to: string) {
    const options = moves!.filter((m) => m.startsWith(from + to));
    if (!options.length) {
      setSelected(null);
      notify("Illegal move.");
      return;
    }
    const choices = [
      ...new Set(options.map((m) => m.split(",")[0].slice(4)).filter(Boolean)),
    ];
    if (choices.length && !appearance.autoQueen) {
      setPromotion({ from, to, choices });
      return;
    }
    onMove?.(from, to, choices.includes("q") ? "q" : choices[0]);
    setSelected(null);
  }
  function click(square: string) {
    if (onSquare) {
      onSquare(square);
      return;
    }
    if (disabled || !onMove) return;
    if (
      selected &&
      square !== selected &&
      moves!.some((m) => m.startsWith(selected + square))
    ) {
      choose(selected, square);
      return;
    }
    if (hidden || moves!.some((m) => m.startsWith(square)))
      setSelected(selected === square ? null : square);
    else setSelected(null);
  }
  function drop(e: DragEvent, square: string) {
    e.preventDefault();
    const from = e.dataTransfer.getData("text/x-chess-square");
    if (!disabled && from && from !== square) choose(from, square);
  }
  return (
    <>
      <div
        className={`board ${compact ? "compact-board" : ""}`}
        role="group"
        aria-label="Chessboard"
        style={
          {
            "--light-square": appearance.light,
            "--dark-square": appearance.dark,
          } as React.CSSProperties
        }
      >
        {[...ranks].flatMap((rank, row) =>
          [...files].map((file, col) => {
            const square = file + rank,
              piece = cells[square],
              fogged = visible && !visible.has(square),
              concealed = hidden || fogged,
              isDark = (file.charCodeAt(0) - 97 + 8 - Number(rank)) % 2 === 1;
            return (
              <button
                key={square}
                disabled={disabled && !onSquare}
                className={`board-square ${isDark ? "dark" : "light"} ${active === square ? "selected" : ""} ${hint === square ? "hinted" : ""} ${appearance.lastMove && highlights.includes(square) ? "last-move" : ""} ${fogged ? "fogged" : ""}`}
                aria-label={`${square}${!concealed && piece ? `, ${piece === "*" ? "duck" : `${piece === piece.toUpperCase() ? "white" : "black"} ${names[piece.toLowerCase()] || piece}`}` : ", empty"}`}
                aria-pressed={active === square}
                onClick={() => click(square)}
                draggable={!disabled && !!onMove && !concealed && !!piece}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/x-chess-square", square);
                  setSelected(square);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => drop(e, square)}
                onKeyDown={(e) => {
                  let delta = 0;
                  if (e.key === "ArrowRight") delta = 1;
                  if (e.key === "ArrowLeft") delta = -1;
                  if (e.key === "ArrowUp") delta = -8;
                  if (e.key === "ArrowDown") delta = 8;
                  if (delta) {
                    e.preventDefault();
                    const buttons =
                      e.currentTarget.parentElement?.querySelectorAll("button");
                    buttons?.[
                      Math.max(0, Math.min(63, row * 8 + col + delta))
                    ]?.focus();
                  }
                }}
              >
                {!concealed && piece && <Piece symbol={piece} />}{" "}
                {appearance.coordinates && col === 0 && (
                  <span className="rank">{rank}</span>
                )}
                {appearance.coordinates && row === 7 && (
                  <span className="file">{file}</span>
                )}
                {appearance.legalMoves &&
                  !hidden &&
                  !fogged &&
                  targets.includes(square) && (
                    <span className={piece ? "legal-capture" : "legal-dot"} />
                  )}
              </button>
            );
          }),
        )}
      </div>
      {promotion && (
        <Modal title="Promote pawn" onClose={() => setPromotion(null)}>
          <div className="promotion-choices">
            {promotion.choices.map((p) => (
              <button
                key={p}
                aria-label={`Promote to ${names[p]}`}
                onClick={() => {
                  onMove?.(promotion.from, promotion.to, p);
                  setPromotion(null);
                  setSelected(null);
                }}
              >
                <Piece symbol={turn === "w" ? p.toUpperCase() : p} />
                <span>{names[p]}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
