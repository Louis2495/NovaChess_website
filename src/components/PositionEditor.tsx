import { useState } from "react";
import { Chess } from "chess.js";
import { Trash2, RotateCcw } from "lucide-react";
import { squares } from "../lib/variants";
import { initialFen } from "../lib/store";
import { Board, Piece } from "./Board";
import { Modal, Button, Field } from "./UI";
export function buildFen(
  p: Record<string, string>,
  turn: string,
  rights: string,
  ep: string,
) {
  let rows = [];
  for (let r = 8; r >= 1; r--) {
    let row = "",
      empty = 0;
    for (const f of "abcdefgh") {
      const piece = p[f + r];
      if (piece) {
        if (empty) {
          row += empty;
          empty = 0;
        }
        row += piece;
      } else empty++;
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return `${rows.join("/")} ${turn} ${rights || "-"} ${ep || "-"} 0 1`;
}
export default function PositionEditor({
  fen,
  onApply,
  onClose,
}: {
  fen: string;
  onApply: (fen: string) => void;
  onClose: () => void;
}) {
  const [pieces, setPieces] = useState(() => squares(fen)),
    [selected, setSelected] = useState("P"),
    [turn, setTurn] = useState(fen.split(" ")[1] || "w"),
    [rights, setRights] = useState(fen.split(" ")[2].replace("-", "")),
    [ep, setEp] = useState(""),
    [error, setError] = useState("");
  const position = buildFen(pieces, turn, rights, ep);
  function apply() {
    try {
      new Chess(position);
      const kings = Object.entries(pieces).filter(
        ([, p]) => p.toLowerCase() === "k",
      );
      if (kings.length !== 2) throw new Error("Place one king for each side.");
      const [a, b] = kings.map(([sq]) => [sq.charCodeAt(0), Number(sq[1])]);
      if (Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1)
        throw new Error("Kings cannot be adjacent.");
      onApply(position);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Modal title="Set up position" onClose={onClose} wide>
      <div className="editor-layout">
        <div>
          <Board
            fen={position}
            selected={null}
            onSquare={(sq) =>
              setPieces((p) => {
                const next = { ...p };
                if (selected === "erase") delete next[sq];
                else next[sq] = selected;
                return next;
              })
            }
          />
        </div>
        <div>
          <h3>Place pieces</h3>
          <div className="piece-palette">
            {"KQRBNPkqrbnp".split("").map((p) => (
              <button
                key={p}
                className={selected === p ? "active" : ""}
                aria-label={`Place ${p === p.toUpperCase() ? "white" : "black"} ${{ k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" }[p.toLowerCase()]}`}
                onClick={() => setSelected(p)}
              >
                <Piece symbol={p} />
              </button>
            ))}
            <Button
              className={selected === "erase" ? "" : "secondary"}
              onClick={() => setSelected("erase")}
            >
              <Trash2 size={15} />
              Erase
            </Button>
          </div>
          <Field label="To move">
            <select value={turn} onChange={(e) => setTurn(e.target.value)}>
              <option value="w">White</option>
              <option value="b">Black</option>
            </select>
          </Field>
          <div className="field">
            <span>Castling rights</span>
            <div className="castling-rights">
              {[
                ["K", "White king"],
                ["Q", "White queen"],
                ["k", "Black king"],
                ["q", "Black queen"],
              ].map(([r, label]) => (
                <label key={r}>
                  <input
                    type="checkbox"
                    checked={rights.includes(r)}
                    onChange={(e) =>
                      setRights((v) =>
                        e.target.checked ? v + r : v.replace(r, ""),
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <Field label="En passant target">
            <input
              value={ep}
              onChange={(e) => setEp(e.target.value)}
              placeholder="e3 or leave empty"
              pattern="[a-h][36]"
            />
          </Field>
          <p className="caption">
            Set turn, castling and en passant rights explicitly.
          </p>
          <div className="button-row">
            <Button
              className="secondary"
              onClick={() => {
                setPieces({});
                setRights("");
              }}
            >
              <Trash2 size={14} />
              Clear
            </Button>
            <Button
              className="secondary"
              onClick={() => {
                setPieces(squares(initialFen));
                setRights("KQkq");
              }}
            >
              <RotateCcw size={14} />
              Initial
            </Button>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button onClick={apply}>Use position</Button>
        </div>
      </div>
    </Modal>
  );
}
