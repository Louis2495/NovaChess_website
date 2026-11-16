import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { useApp } from "../lib/context";
import { base, pieceUrl, boardSizeKey, annotationColors } from "../lib/store";
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
  opacity?: number;
  label?: string;
};
export function Board({
  fen,
  onMove,
  onSquare,
  legalMoves,
  flipped: preferredFlip,
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
  onCancelPremoves,
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
  onCancelPremoves?: () => boolean;
  onFlip?: () => void;
  materialFen?: string;
  guides?: BoardMark[];
}) {
  const { appearance, setAppearance, tab, detail } = useApp();
  const sizeKey = boardSizeKey(tab, detail);
  const manualBoardSize =
    appearance.boardSizes?.[sizeKey] ?? appearance.globalBoardSize;
  const resizeGesture = useRef<{ x: number; y: number; size: number } | null>(
    null,
  );
  const [measuredSize, setMeasuredSize] = useState(appearance.boardSize);
  const [viewportLimit, setViewportLimit] = useState<number | null>(null);
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
      right: boolean;
      color: string;
      moving: boolean;
      pointerId: number;
    } | null>(null),
    suppressClick = useRef(false),
    canceledRight = useRef(false);
  const [startingFlip] = useState(() => fen.split(" ")[1] === "b");
  const initialFlip =
    preferredFlip ?? (disabled ? fen.split(" ")[1] === "b" : startingFlip);
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
  function cancelDrag() {
    const g = gesture.current;
    if (!g || g.right) return false;
    gesture.current = null;
    setDrag(null);
    setSelected(g.from);
    suppressClick.current = true;
    canceledRight.current = true;
    boardRef.current
      ?.querySelectorAll<HTMLElement>(".board-square")
      .forEach((el) => {
        if (el.hasPointerCapture(g.pointerId))
          el.releasePointerCapture(g.pointerId);
      });
    return true;
  }
  useEffect(() => {
    const mouseDown = (event: MouseEvent) => {
      if (event.button === 2 && cancelDrag()) event.preventDefault();
    };
    const contextMenu = (event: MouseEvent) => {
      if (canceledRight.current) {
        event.preventDefault();
        event.stopPropagation();
        canceledRight.current = false;
      }
    };
    window.addEventListener("mousedown", mouseDown, true);
    window.addEventListener("contextmenu", contextMenu, true);
    return () => {
      window.removeEventListener("mousedown", mouseDown, true);
      window.removeEventListener("contextmenu", contextMenu, true);
    };
  }, []);
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
  function dropSquare(from: string, x: number, y: number) {
    const direct = squareAt(x, y);
    if (direct === from || moves!.some(m => m.startsWith(from + direct))) return direct;
    const box = boardRef.current!.getBoundingClientRect(), size = box.width / 8;
    const candidates = [...new Set(moves!.filter(m => m.startsWith(from)).map(m => m.slice(2, 4)))];
    const nearby = candidates.map(to => {
      const cx = box.left + (files.indexOf(to[0]) + .5) * size;
      const cy = box.top + (ranks.indexOf(to[1]) + .5) * size;
      const edgeDistance = Math.hypot(Math.max(0, Math.abs(x-cx)-size/2), Math.max(0, Math.abs(y-cy)-size/2));
      return { to, edgeDistance, distance: Math.hypot(x-cx, y-cy) };
    }).filter(t => t.edgeDistance <= size * .49).sort((a,b) => a.distance-b.distance);
    return nearby[0]?.to ?? direct;
  }
  function choose(from: string, to: string) {
    setSelected(from);
    const options = moves!.filter((m) => m.startsWith(from + to));
    if (!options.length) return;
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
  function resizeBoard(size: number) {
    const next = Math.max(160, Math.min(1400, Math.round(size)));
    setAppearance((a) => ({
      ...a,
      boardSizes: { ...a.boardSizes, [sizeKey]: next },
    }));
  }
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setMeasuredSize(Math.round(rect.width));
      el.closest<HTMLElement>(".board-column")
        ?.style.setProperty("--actual-board-width", `${rect.width}px`);
      // Leave room for material and replay controls; use document position so
      // scrolling never changes the board size while someone is using it.
      const top = rect.top + window.scrollY;
      const available = window.innerHeight - top - 90;
      const limit = Math.floor(Math.max(160, available >= 160 ? available : window.innerHeight - 230));
      setViewportLimit(previous => previous === limit ? previous : limit);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.parentElement) observer.observe(el.parentElement);
    window.addEventListener("resize", measure);
    let active = true;
    document.fonts.ready.then(() => { if (active) measure(); });
    measure();
    return () => { active = false; observer.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  function coord(square: string) {
    return {
      x: ((files.indexOf(square[0]) + 0.5) * 100) / 8,
      y: ((ranks.indexOf(square[1]) + 0.5) * 100) / 8,
    };
  }
  return (
    <div
      className={`board-frame ${compact ? "compact-frame" : ""}`}
      style={
        {
          maxWidth: compact ? undefined : viewportLimit !== null ? `${viewportLimit}px` : "max(160px, calc(100dvh - 230px))",
          ...(manualBoardSize ? { width: `min(100%, ${manualBoardSize}px)`, flex: "0 1 auto" } : {}),
        }
      }
    >
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
          if (cancelDrag() || canceledRight.current) {
            canceledRight.current = false;
            return;
          }
          if (onCancelPremoves?.()) return;
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
              x: e.clientX,
              y: e.clientY,
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
            const to = dropSquare(g.from, e.clientX, e.clientY);
            if (to && to !== g.from) choose(g.from, to);
            else setSelected(g.from);
          }
        }}
        onPointerCancel={() => {
          const g = gesture.current;
          if (g && !g.right) setSelected(g.from);
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
              squareMark = [...guides, ...currentMarks].reverse().find(m => m.from === square && m.to === square),
              isDark = (file.charCodeAt(0) - 97 + 8 - Number(rank)) % 2 === 1;
            return (
              <button
                key={square}
                className={`board-square ${isDark ? "dark" : "light"} ${active === square ? "selected" : ""} ${hint === square ? "hinted" : ""} ${appearance.lastMove && highlights.includes(square) ? "last-move" : ""} ${fogged ? "fogged" : ""} ${blocked.includes(square) ? "dropped-square" : ""} ${drag?.from === square ? "drag-origin" : ""}`}
                aria-label={`${square}${blocked.includes(square) ? ", unavailable" : !concealed && piece ? `, ${piece === "*" ? "duck" : `${piece === piece.toUpperCase() ? "white" : "black"} ${names[piece.toLowerCase()] || piece}`}` : ", empty"}`}
                data-annotation={squareMark?.color}
                style={squareMark && !fogged && !blocked.includes(square) ? { background: squareMark.color } : undefined}
                aria-pressed={active === square}
                aria-disabled={
                  blocked.includes(square) || (disabled && !onSquare)
                }
                onClick={() => click(square)}
                onPointerDown={(e) => {
                  if (e.button === 0) suppressClick.current = false;
                  pointer.current = { x: e.clientX, y: e.clientY };
                  if (e.button === 2) {
                    e.preventDefault();
                    if (cancelDrag() || canceledRight.current) return;
                    if (onCancelPremoves?.()) {
                      gesture.current = null;
                      return;
                    }
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
                      mark: appearance.markColors?.green || annotationColors.green,
                      markBlue: appearance.markColors?.blue || annotationColors.blue,
                      markRed: appearance.markColors?.red || annotationColors.red,
                      markGold: appearance.markColors?.gold || annotationColors.gold,
                    };
                    gesture.current = {
                      from: square,
                      startX: e.clientX,
                      startY: e.clientY,
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
                  gesture.current = {
                    from: square,
                    startX: e.clientX,
                    startY: e.clientY,
                    right: false,
                    color: "",
                    moving: false,
                    pointerId: e.pointerId,
                  };
                  setDrag({
                    from: square,
                    symbol: piece,
                    x: e.clientX,
                    y: e.clientY,
                    size: boardRef.current!.clientWidth / 8,
                  });
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
                {!fogged && appearance.coordinates && col === 0 && (
                  <span className="rank">{rank}</span>
                )}
                {!fogged && appearance.coordinates && row === 7 && (
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
            if (m.from === m.to) return null;
            const dx = Math.abs(b.x - a.x),
              dy = Math.abs(b.y - a.y);
            const knight =
              (dx === 25 && dy === 12.5) || (dy === 25 && dx === 12.5);
            const elbow = knight
              ? dx > dy
                ? { x: b.x, y: a.y }
                : { x: a.x, y: b.y }
              : a;
            const angle = Math.atan2(b.y - elbow.y, b.x - elbow.x),
              end = {
                x: b.x - Math.cos(angle) * 3,
                y: b.y - Math.sin(angle) * 3,
              };
            return (
              <g
                key={i}
                stroke={m.color}
                fill={m.color}
                opacity={m.opacity ?? 0.85}
              >
                {knight ? (
                  <polyline
                    points={`${a.x},${a.y} ${elbow.x},${elbow.y} ${end.x},${end.y}`}
                    fill="none"
                    strokeWidth={Math.max(0.7, Math.min(4, m.weight || 2.3))}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={end.x}
                    y2={end.y}
                    strokeWidth={Math.max(0.7, Math.min(4, m.weight || 2.3))}
                    strokeLinecap="round"
                  />
                )}
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
        <div
          className="board-resize-handle"
          role="slider"
          aria-label="Resize board"
          title="Drag to resize · double-click to reset"
          aria-valuemin={160}
          aria-valuemax={1400}
          aria-valuenow={measuredSize}
          aria-valuetext={`${measuredSize} pixels`}
          tabIndex={0}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setAppearance((a) => {
              const sizes = { ...a.boardSizes };
              delete sizes[sizeKey];
              return { ...a, boardSizes: sizes };
            });
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            resizeGesture.current = {
              x: e.clientX,
              y: e.clientY,
              size: boardRef.current!.getBoundingClientRect().width,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!resizeGesture.current) return;
            e.preventDefault();
            e.stopPropagation();
            const r = resizeGesture.current;
            resizeBoard(
              r.size +
                (Math.abs(e.clientX - r.x) > Math.abs(e.clientY - r.y)
                  ? e.clientX - r.x
                  : e.clientY - r.y),
            );
          }}
          onPointerUp={(e) => {
            if (!resizeGesture.current) return;
            e.stopPropagation();
            resizeGesture.current = null;
            if (e.currentTarget.hasPointerCapture(e.pointerId))
              e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => {
            resizeGesture.current = null;
          }}
          onKeyDown={(e) => {
            if (
              ["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"].includes(
                e.key,
              )
            ) {
              e.preventDefault();
              e.stopPropagation();
              resizeBoard(
                measuredSize +
                  (["ArrowRight", "ArrowUp"].includes(e.key) ? 20 : -20),
              );
            }
          }}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M4 12 12 4M8 13l5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      {imbalance > 0 && (
        <div
          className={`material-imbalance ${compact ? "compact-material" : ""}`}
          aria-label={`Material advantage for ${flipped ? "Black" : "White"}: +${imbalance}`}
        >
          <b>+{imbalance}</b>
        </div>
      )}
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
                e.stopPropagation();
                setSelected(promotion.from);
                setPromotion(null);
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
                  setSelected(promotion.from);
                  setPromotion(null);
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
