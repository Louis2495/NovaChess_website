import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { useApp } from "../lib/context";
import { base, pieceUrl } from "../lib/store";
import { squares } from "../lib/variants";
import { defaultControls, useControl } from "../lib/controls";
export function Piece({ symbol, style }: { symbol: string; style?: string }) {
  const { appearance } = useApp();
  return (
    <img
      className={`piece ${symbol === "*" ? "duck-piece" : ""}`}
      src={
        symbol === "*"
          ? `${base}duck.webp`
          : pieceUrl(
              `${symbol === symbol.toUpperCase() ? "w" : "b"}${symbol.toUpperCase()}`,
              style || appearance.pieceStyle,
            )
      }
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
export type BoardMark = {
  from: string;
  to: string;
  color: string;
  weight?: number;
  label?: string;
};
export function Board({
  fen,
  onMove,
  onSquare,
  legalMoves,
  flipped: initialFlip = false,
  disabled = false,
  hidden = false,
  visible,
  highlights = [],
  hint,
  selected: externalSelected,
  compact = false,
  blocked = [],
  onMarksChange,
  marks: externalMarks,
  onCancel,
  onFlip,
  materialFen,
  guides = [],
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
  blocked?: string[];
  marks?: BoardMark[];
  onMarksChange?: (marks: BoardMark[]) => void;
  onCancel?: () => void;
  onFlip?: () => void;
  materialFen?: string;
  guides?: BoardMark[];
}) {
  const { appearance, notify } = useApp();
  const boardRef = useRef<HTMLDivElement>(null),
    pointer = useRef({ x: 0, y: 0 });
  const [selected, setSelected] = useState<string | null>(null),
    [flipOffset, setFlipOffset] = useState(false),
    [promotion, setPromotion] = useState<{
      from: string;
      to: string;
      choices: string[];
      x: number;
      y: number;
      size: number;
      leftwards: boolean;
    } | null>(null),
    [marks, setMarks] = useState<BoardMark[]>([]),
    [drag, setDrag] = useState<{
      from: string;
      symbol: string;
      x: number;
      y: number;
      size: number;
    } | null>(null);
  const gesture = useRef<{
      from: string;
      startX: number;
      startY: number;
      offsetX: number;
      offsetY: number;
      right: boolean;
      color: string;
      moving: boolean;
      pointerId: number;
    } | null>(null),
    suppressClick = useRef(false);
  const flipped = initialFlip !== flipOffset,
    cells = squares(fen),
    turn = fen.split(" ")[1],
    files = flipped ? "hgfedcba" : "abcdefgh",
    ranks = flipped ? "12345678" : "87654321";
  useControl("flip", () => {
    if (!compact && !boardRef.current?.closest("[hidden]")) {
      if (onFlip) onFlip();
      else setFlipOffset((v) => !v);
    }
  });
  useControl("clearMarks", () => {
    updateMarks([]);
    setPromotion(null);
    setSelected(null);
    onCancel?.();
  });
  useEffect(() => {
    setSelected(null);
    setPromotion(null);
    setDrag(null);
    setMarks([]);
  }, [fen]);
  let moves = legalMoves;
  if (!moves)
    try {
      moves = new Chess(fen)
        .moves({ verbose: true })
        .map((m) => m.from + m.to + (m.promotion || ""));
    } catch {
      moves = [];
    }
  const active = externalSelected ?? selected,
    targets = active
      ? moves.filter((m) => m.startsWith(active)).map((m) => m.slice(2, 4))
      : [];
  const currentMarks = externalMarks || marks;
  function updateMarks(next: BoardMark[]) {
    setMarks(next);
    onMarksChange?.(next);
  }
  function mark(from: string, to: string, color: string) {
    const exists = currentMarks.some(
      (m) => m.from === from && m.to === to && m.color === color,
    );
    updateMarks([
      ...currentMarks.filter((m) => !(m.from === from && m.to === to)),
      ...(exists ? [] : [{ from, to, color }]),
    ]);
  }
  function squareAt(x: number, y: number) {
    const box = boardRef.current!.getBoundingClientRect(),
      size = box.width / 8;
    if (
      x < box.left - size * 0.4 ||
      x > box.right + size * 0.4 ||
      y < box.top - size * 0.4 ||
      y > box.bottom + size * 0.4
    )
      return null;
    const col = Math.max(0, Math.min(7, Math.floor((x - box.left) / size))),
      row = Math.max(0, Math.min(7, Math.floor((y - box.top) / size)));
    return files[col] + ranks[row];
  }
  function choose(from: string, to: string) {
    const options = moves!.filter((m) => m.startsWith(from + to));
    if (!options.length) {
      setSelected(null);
      notify("Illegal move.");
      return;
    }
    const choices = [
      ...new Set(options.map((m) => m.split(",")[0].slice(4)).filter(Boolean)),
    ].sort((a, b) => "qrbn".indexOf(a) - "qrbn".indexOf(b));
    if (choices.length && !appearance.autoQueen) {
      const size = Math.min(72, boardRef.current!.clientWidth / 6),
        x = Math.max(
          size / 2,
          Math.min(innerWidth - size / 2, pointer.current.x),
        ),
        y = Math.max(
          size / 2,
          Math.min(innerHeight - size / 2, pointer.current.y),
        );
      setPromotion({
        from,
        to,
        choices,
        x,
        y,
        size,
        leftwards: x + size * (choices.length - 0.5) > innerWidth,
      });
      return;
    }
    onMove?.(from, to, choices.includes("q") ? "q" : choices[0]);
    setSelected(null);
  }
  function click(square: string) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (blocked.includes(square)) return;
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
    setSelected(
      hidden || moves!.some((m) => m.startsWith(square))
        ? selected === square
          ? null
          : square
        : null,
    );
  }
  const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 },
    pieces =
      Object.values(squares(materialFen || fen)).join("") +
      ((materialFen || fen).split(" ")[0].match(/\[([^\]]*)\]/)?.[1] || ""),
    imbalance =
      [...pieces].reduce(
        (s, p) =>
          s + (values[p.toLowerCase()] || 0) * (p === p.toUpperCase() ? 1 : -1),
        0,
      ) * (flipped ? -1 : 1);
  function coord(square: string) {
    return {
      x: ((files.indexOf(square[0]) + 0.5) * 100) / 8,
      y: ((ranks.indexOf(square[1]) + 0.5) * 100) / 8,
    };
  }
  return (
    <div className={`board-frame ${compact ? "compact-frame" : ""}`}>
      {imbalance < 0 && (
        <div
          className="material-advantage material-top"
          aria-label={`Material advantage for ${flipped ? "White" : "Black"}: +${Math.abs(imbalance)}`}
        >
          <b>+{Math.abs(imbalance)}</b>
        </div>
      )}
      <div
        ref={boardRef}
        className={`board ${compact ? "compact-board" : ""}`}
        role="group"
        aria-label="Chessboard"
        style={
          {
            "--light-square": appearance.light,
            "--dark-square": appearance.dark,
          } as React.CSSProperties
        }
        onContextMenu={(e) => {
          e.preventDefault();
          onCancel?.();
        }}
        onPointerMove={(e) => {
          pointer.current = { x: e.clientX, y: e.clientY };
          const g = gesture.current;
          if (!g) return;
          if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > 4)
            g.moving = true;
          if (!g.right && g.moving && cells[g.from])
            setDrag({
              from: g.from,
              symbol: cells[g.from],
              x: e.clientX - g.offsetX,
              y: e.clientY - g.offsetY,
              size: boardRef.current!.clientWidth / 8,
            });
        }}
        onPointerUp={(e) => {
          const g = gesture.current;
          if (!g) return;
          gesture.current = null;
          setDrag(null);
          if (g.right) {
            const to = squareAt(e.clientX, e.clientY);
            if (to) mark(g.from, to, g.color);
            return;
          }
          if (g.moving) {
            suppressClick.current = true;
            const to = squareAt(e.clientX - g.offsetX, e.clientY - g.offsetY);
            if (to && to !== g.from) choose(g.from, to);
          }
        }}
        onPointerCancel={() => {
          gesture.current = null;
          setDrag(null);
        }}
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
                className={`board-square ${isDark ? "dark" : "light"} ${active === square ? "selected" : ""} ${hint === square ? "hinted" : ""} ${appearance.lastMove && highlights.includes(square) ? "last-move" : ""} ${fogged ? "fogged" : ""} ${blocked.includes(square) ? "dropped-square" : ""} ${drag?.from === square ? "drag-origin" : ""}`}
                aria-label={`${square}${blocked.includes(square) ? ", unavailable" : !concealed && piece ? `, ${piece === "*" ? "duck" : `${piece === piece.toUpperCase() ? "white" : "black"} ${names[piece.toLowerCase()] || piece}`}` : ", empty"}`}
                aria-pressed={active === square}
                aria-disabled={
                  blocked.includes(square) || (disabled && !onSquare)
                }
                onClick={() => click(square)}
                onPointerDown={(e) => {
                  pointer.current = { x: e.clientX, y: e.clientY };
                  if (e.button === 2) {
                    e.preventDefault();
                    if (onCancel) {
                      onCancel();
                      return;
                    }
                    const modifier = e.shiftKey
                      ? "shift"
                      : e.altKey
                        ? "alt"
                        : e.ctrlKey || e.metaKey
                          ? "ctrl"
                          : "none";
                    const key =
                      Object.entries({
                        ...defaultControls,
                        ...appearance.controls,
                      }).find(
                        ([k, v]) => k.startsWith("mark") && v === modifier,
                      )?.[0] || "mark";
                    const colors = {
                      mark: appearance.markColors?.green || "#63d6a1",
                      markBlue: appearance.markColors?.blue || "#67b8ff",
                      markRed: appearance.markColors?.red || "#ff7b92",
                      markGold: appearance.markColors?.gold || "#ffd071",
                    };
                    gesture.current = {
                      from: square,
                      startX: e.clientX,
                      startY: e.clientY,
                      offsetX: 0,
                      offsetY: 0,
                      right: true,
                      color: colors[key as keyof typeof colors] || colors.mark,
                      moving: false,
                      pointerId: e.pointerId,
                    };
                    e.currentTarget.setPointerCapture(e.pointerId);
                    return;
                  }
                  if (
                    e.button !== 0 ||
                    disabled ||
                    !onMove ||
                    !piece ||
                    concealed ||
                    blocked.includes(square)
                  )
                    return;
                  const box = e.currentTarget.getBoundingClientRect();
                  gesture.current = {
                    from: square,
                    startX: e.clientX,
                    startY: e.clientY,
                    offsetX: e.clientX - box.left - box.width / 2,
                    offsetY: e.clientY - box.top - box.height / 2,
                    right: false,
                    color: "",
                    moving: false,
                    pointerId: e.pointerId,
                  };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onKeyDown={(e) => {
                  let delta = 0;
                  if (e.key === "ArrowRight") delta = 1;
                  if (e.key === "ArrowLeft") delta = -1;
                  if (e.key === "ArrowUp") delta = -8;
                  if (e.key === "ArrowDown") delta = 8;
                  if (delta) {
                    e.preventDefault();
                    e.stopPropagation();
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
        <svg className="board-marks" viewBox="0 0 100 100" aria-hidden="true">
          {[...guides, ...currentMarks].map((m, i) => {
            const a = coord(m.from),
              b = coord(m.to);
            if (m.from === m.to)
              return (
                <rect
                  key={i}
                  x={a.x - 6.25}
                  y={a.y - 6.25}
                  width={12.5}
                  height={12.5}
                  fill={m.color}
                  opacity=".45"
                />
              );
            const angle = Math.atan2(b.y - a.y, b.x - a.x),
              end = {
                x: b.x - Math.cos(angle) * 3,
                y: b.y - Math.sin(angle) * 3,
              };
            return (
              <g key={i} stroke={m.color} fill={m.color} opacity=".85">
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={end.x}
                  y2={end.y}
                  strokeWidth={Math.max(0.7, Math.min(4, m.weight || 2.3))}
                  strokeLinecap="round"
                />
                <path
                  d={`M ${b.x} ${b.y} L ${b.x - Math.cos(angle - 0.55) * 5} ${b.y - Math.sin(angle - 0.55) * 5} L ${b.x - Math.cos(angle + 0.55) * 5} ${b.y - Math.sin(angle + 0.55) * 5} Z`}
                />
                {m.label && (
                  <text
                    x={(a.x + b.x) / 2}
                    y={(a.y + b.y) / 2 - 1.7}
                    textAnchor="middle"
                    fill="var(--text)"
                    stroke="var(--base)"
                    strokeWidth=".8"
                    paintOrder="stroke"
                    fontSize="3.3"
                    fontWeight="700"
                  >
                    {m.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div
        className={`material-imbalance ${compact ? "compact-material" : ""}`}
        aria-label={
          imbalance > 0
            ? `Material advantage for ${flipped ? "Black" : "White"}: +${imbalance}`
            : imbalance === 0
              ? "Material is equal"
              : undefined
        }
      >
        <b>{imbalance > 0 ? `+${imbalance}` : imbalance === 0 ? "0" : ""}</b>
      </div>
      {drag && (
        <div
          className="drag-piece"
          style={{
            left: drag.x - drag.size / 2,
            top: drag.y - drag.size / 2,
            width: drag.size,
            height: drag.size,
          }}
        >
          <Piece symbol={drag.symbol} />
        </div>
      )}
      {promotion && (
        <>
          <div
            className="promotion-dismiss"
            onPointerDown={() => setPromotion(null)}
          />
          <div
            className="promotion-inline"
            role="dialog"
            aria-label="Promote pawn"
            onKeyDown={(e) => {
              if (
                e.key.toLowerCase() ===
                (appearance.controls?.clearMarks || "Escape").toLowerCase()
              ) {
                e.preventDefault();
                setPromotion(null);
                setSelected(null);
              }
            }}
            style={{
              left: promotion.x - promotion.size / 2,
              top: promotion.y - promotion.size / 2,
              flexDirection: promotion.leftwards ? "row-reverse" : "row",
              transform: promotion.leftwards
                ? `translateX(-${promotion.size * (promotion.choices.length - 1)}px)`
                : undefined,
            }}
          >
            {promotion.choices.map((p, i) => (
              <button
                key={p}
                autoFocus={i === 0}
                style={{ width: promotion.size, height: promotion.size }}
                aria-label={`Promote to ${names[p]}`}
                onClick={() => {
                  onMove?.(promotion.from, promotion.to, p);
                  setPromotion(null);
                  setSelected(null);
                }}
              >
                <Piece symbol={turn === "w" ? p.toUpperCase() : p} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
