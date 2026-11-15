import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Chess, type Square } from "chess.js";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Plus,
  Minus,
  X,
  Menu,
  Play,
  Puzzle,
  BookOpen,
  ScanLine,
  WifiOff,
  ShieldCheck,
  Zap,
  Check,
  CheckCheck,
  Cpu,
  Sparkles,
  Flame,
  Lightbulb,
  RotateCcw,
  Palette,
  Clock3,
  Trophy,
  EyeOff,
  Crown,
  Flag,
  Layers3,
  Home,
  Grid2X2,
  Settings2,
  Camera,
  Apple,
  Github,
  ExternalLink,
  Volume2,
  GraduationCap,
  Target,
  Heart,
} from "lucide-react";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "./styles.css";

const APP_SOURCE = "https://github.com/Louis2495/ChessVision";
const INITIAL = new Chess().fen();
const HERO_GAME = new Chess();
[
  "e4",
  "e5",
  "Nf3",
  "Nc6",
  "Bc4",
  "Bc5",
  "c3",
  "Nf6",
  "d3",
  "d6",
  "O-O",
  "O-O",
].forEach((m) => HERO_GAME.move(m));
const HERO = HERO_GAME.fen();
const base = import.meta.env.BASE_URL;
const pieceNames: Record<string, string> = {
  p: "pawn",
  r: "rook",
  n: "knight",
  b: "bishop",
  q: "queen",
  k: "king",
};
const palettes = [
  { name: "Forest", light: "#e8e3d1", dark: "#5c7866", accent: "#2e654b" },
  { name: "Ocean", light: "#deeaf2", dark: "#376e99", accent: "#28668d" },
  { name: "Rose", light: "#f5dfe4", dark: "#a85d77", accent: "#a24c6e" },
  { name: "Walnut", light: "#ead7b7", dark: "#6e4730", accent: "#765136" },
  { name: "Lavender", light: "#e9e2f1", dark: "#7c6899", accent: "#796096" },
];
function Piece({
  piece,
  className = "",
}: {
  piece: string;
  className?: string;
}) {
  return (
    <img
      className={`piece ${className}`}
      src={`${base}pieces/${piece}.svg`}
      alt=""
      draggable="false"
    />
  );
}
function Board({
  fen = INITIAL,
  interactive = false,
  selected = null,
  targets = [],
  onSquare,
  theme = 0,
  highlights = [],
  label = "Chess position",
}: {
  fen?: string;
  interactive?: boolean;
  selected?: string | null;
  targets?: string[];
  onSquare?: (square: Square) => void;
  theme?: number;
  highlights?: string[];
  label?: string;
}) {
  const chess = new Chess(fen);
  return (
    <div
      className={`chessboard ${interactive ? "interactive" : ""}`}
      role={interactive ? "group" : "img"}
      aria-label={label}
      style={
        {
          "--light": palettes[theme].light,
          "--dark": palettes[theme].dark,
        } as React.CSSProperties
      }
    >
      {chess
        .board()
        .flat()
        .map((p, i) => {
          const square =
            `${"abcdefgh"[i % 8]}${8 - Math.floor(i / 8)}` as Square;
          const isDark = (Math.floor(i / 8) + (i % 8)) % 2 === 1;
          const content = (
            <>
              {p && <Piece piece={`${p.color}${p.type.toUpperCase()}`} />}{" "}
              {i % 8 === 0 && (
                <span className="rank">{8 - Math.floor(i / 8)}</span>
              )}
              {i >= 56 && <span className="file">{"abcdefgh"[i % 8]}</span>}
              {targets.includes(square) && (
                <span className={`move-dot ${p ? "capture" : ""}`} />
              )}
            </>
          );
          const className = `square ${isDark ? "dark" : "light"} ${selected === square ? "selected" : ""} ${highlights.includes(square) ? "highlight" : ""}`;
          return interactive ? (
            <button
              key={square}
              className={className}
              aria-label={`${square}${p ? `, ${p.color === "w" ? "white" : "black"} ${pieceNames[p.type]}` : ", empty"}`}
              onClick={() => onSquare?.(square)}
              aria-pressed={selected === square}
            >
              {content}
            </button>
          ) : (
            <div key={square} className={className}>
              {content}
            </div>
          );
        })}
    </div>
  );
}
function Brand({ light = false }: { light?: boolean }) {
  return (
    <a
      href="#"
      className={`brand ${light ? "brand-light" : ""}`}
      aria-label="NovaChess home"
    >
      <img src={`${base}app-icon.webp`} alt="" width="36" height="36" />
      <span>
        NovaChess<span className="brand-dot">✦</span>
      </span>
    </a>
  );
}
function Phone({
  theme = 0,
  screen = "analysis",
}: {
  theme?: number;
  screen?: string;
}) {
  return (
    <div
      className="phone"
      style={
        { "--phone-accent": palettes[theme].accent } as React.CSSProperties
      }
      role="img"
      aria-label="Illustrated preview of NovaChess on iPhone"
    >
      <div className="phone-screen">
        <div className="phone-status">
          <span>9:41</span>
          <div className="island" />
          <span className="status-icons">
            ▮▮▮ <span>●</span> ▰
          </span>
        </div>
        <div className="phone-title">
          <Settings2 size={17} />
          <strong>
            {screen === "analysis"
              ? "Analysis"
              : screen === "puzzles"
                ? "Puzzles"
                : "Play"}
          </strong>
          <Camera size={18} />
        </div>
        <div className="phone-player">
          <span className="avatar">
            <Cpu size={15} />
          </span>
          <div>
            <b>Stockfish 19</b>
            <span>On-device analysis</span>
          </div>
          <span className="depth">Depth 24</span>
        </div>
        <div className="phone-board">
          <Board fen={HERO} theme={theme} highlights={["f1", "g1"]} />
          <div className="eval-bar">
            <span>+0.3</span>
          </div>
        </div>
        <div className="phone-board-controls">
          <ChevronLeft size={16} />
          <div />
          <ChevronRight size={16} />
        </div>
        <div className="candidate">
          <span className="candidate-label">
            <Sparkles size={13} /> BEST CONTINUATION
          </span>
          <div>
            <b>1. Re1</b>
            <span>a6</span>
            <b>2. Bb3</b>
            <span>Ba7</span>
            <em>+0.3</em>
          </div>
        </div>
        <div className="phone-row">
          <span>
            <Lightbulb size={16} /> Position insights
          </span>
          <ChevronDown size={15} />
        </div>
        <div className="phone-row">
          <span>
            <Layers3 size={16} /> Candidate lines
          </span>
          <span className="toggle" />
        </div>
        <div className="phone-bottom">
          {[
            [Home, "Home"],
            [Grid2X2, "Analysis"],
            [Cpu, "Play"],
            [Puzzle, "Puzzles"],
            [BookOpen, "Learn"],
          ].map(([Icon, text]) => {
            const I = Icon as typeof Home;
            return (
              <div
                key={String(text)}
                className={text === "Analysis" ? "active" : ""}
              >
                <I size={18} />
                <span>{String(text)}</span>
              </div>
            );
          })}
        </div>
        <div className="home-indicator" />
      </div>
    </div>
  );
}
function App() {
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState<"launch" | "privacy" | "credits" | null>(
    null,
  );
  const [theme, setTheme] = useState(0);
  const [variant, setVariant] = useState("Standard");
  const [activeTour, setActiveTour] = useState("Analysis");
  const modalRef = useRef<HTMLDialogElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (modal) {
      lastFocus.current = document.activeElement as HTMLElement;
      modalRef.current?.showModal();
      document.body.style.overflow = "hidden";
    } else {
      modalRef.current?.close();
      document.body.style.overflow = "";
      lastFocus.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modal]);
  const closeMenu = () => setMenu(false);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="nav-wrap">
          <Brand />
          <nav
            className={menu ? "nav-links open" : "nav-links"}
            aria-label="Main navigation"
          >
            <a href="#features" onClick={closeMenu}>
              The app
            </a>
            <a href="#playground" onClick={closeMenu}>
              Try it out
            </a>
            <a href="#your-style" onClick={closeMenu}>
              Your style
            </a>
            <a href="#faq" onClick={closeMenu}>
              FAQ
            </a>
          </nav>
          <button
            className="button button-small nav-cta"
            onClick={() => setModal("launch")}
          >
            Follow the launch <ArrowUpRight size={16} />
          </button>
          <button
            className="menu-toggle icon-button"
            aria-label={menu ? "Close menu" : "Open menu"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main id="main">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="status-dot" /> A WHOLE NEW WAY TO CHESS
            </div>
            <h1>
              Your next move.
              <br />
              <span>A little brighter.</span>
              <svg
                className="heading-spark"
                width="44"
                height="44"
                viewBox="0 0 44 44"
                aria-hidden="true"
              >
                <path
                  d="M22 0C24 16 28 20 44 22C28 24 24 28 22 44C20 28 16 24 0 22C16 20 20 16 22 0Z"
                  fill="currentColor"
                />
              </svg>
            </h1>
            <p className="hero-description">
              Play. Discover. Get a little better.
              <br />
              Your whole chess world, in your pocket.
            </p>
            <div className="hero-actions">
              <a className="button" href="#features">
                Meet NovaChess <ArrowDownIcon />
              </a>
              <a className="text-link" href="#playground">
                <span className="play-circle">
                  <Play size={12} fill="currentColor" />
                </span>{" "}
                Make your first move
              </a>
            </div>
            <div className="hero-footnote">
              <Apple size={16} />
              <span>Made for iPhone</span>
              <span className="tiny-dot" />
              <span>Coming soon</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="floating-spark spark-one">✦</span>
            <span className="floating-spark spark-two">✧</span>
            <div className="hero-checker" />
            <div className="hero-phone">
              <Phone />
            </div>
            <div className="float-card float-puzzle">
              <span className="float-icon">
                <Puzzle size={24} />
              </span>
              <div>
                <strong>One more puzzle?</strong>
                <span>4,000 little breakthroughs.</span>
              </div>
              <span className="float-card-star">✦</span>
            </div>
            <div className="float-card float-engine">
              <span className="engine-orb">
                <Zap size={20} fill="currentColor" />
              </span>
              <div>
                <strong>Big brain. Zero Wi-Fi.</strong>
                <span>Stockfish 19, built right in.</span>
              </div>
            </div>
            <div className="hero-caption">
              <span className="caption-line" /> App interface illustration ·
              Made for the love of chess.
            </div>
          </div>
        </section>
        <section className="benefit-strip" aria-label="NovaChess at a glance">
          <div className="section-wrap strip-inner">
            <span>
              <WifiOff />
              Offline, on your terms
            </span>
            <span>
              <ShieldCheck />
              Your photos stay yours
            </span>
            <span>
              <Sparkles />
              No subscription
            </span>
            <span>
              <Heart />
              Made for the love of chess
            </span>
          </div>
        </section>
        <section id="features" className="features section-wrap section-space">
          <div className="section-heading">
            <div>
              <span className="eyebrow">FIVE TABS. ENDLESS POSSIBILITIES.</span>
              <h2>
                One app.
                <br />
                <span>Big chess energy.</span>
              </h2>
            </div>
            <p>
              From your first “aha”
              <br />
              to your next brilliant move.
            </p>
          </div>
          <div className="feature-grid">
            <article className="feature-card feature-analysis">
              <div className="card-top">
                <span className="feature-icon">
                  <ScanLine />
                </span>
                <span className="mini-pill">01 / ANALYZE</span>
              </div>
              <h3>See the bigger picture.</h3>
              <p>Stockfish 19. Clear insights. All on-device.</p>
              <div className="analysis-visual">
                <div className="scan-corners">
                  <Board fen={HERO} />
                </div>
                <div className="analysis-tag">
                  <span className="tag-star">✦</span>
                  <div>
                    <b>Find the idea.</b>
                    <small>Explore every possibility.</small>
                  </div>
                  <ArrowUpRight size={20} />
                </div>
              </div>
              <a
                href="#playground"
                onClick={() => setActiveTour("Analysis")}
                className="card-link"
              >
                Look closer <ArrowUpRight size={16} />
              </a>
            </article>
            <article className="feature-card feature-puzzles">
              <div className="card-top">
                <span className="feature-icon">
                  <Puzzle />
                </span>
                <span className="mini-pill">02 / PRACTICE</span>
              </div>
              <h3>A daily dose of “got it.”</h3>
              <p>4,000 puzzles. Your pace. Your streak.</p>
              <div className="puzzle-visual">
                <div className="streak-mark">
                  <Flame fill="currentColor" />
                  <span>
                    A little better.
                    <br />
                    <b>Every day.</b>
                  </span>
                </div>
                <div className="week-grid">
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                    <div key={i}>
                      <span>{d}</span>
                      <span
                        className={
                          i < 4 ? "day complete" : i === 4 ? "day today" : "day"
                        }
                      >
                        {i < 4 ? (
                          <Check size={19} />
                        ) : i === 4 ? (
                          <Flame size={19} />
                        ) : (
                          <span className="day-dot" />
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <span className="visual-caption">
                  A new daily puzzle. A reason to come back.
                </span>
              </div>
              <a
                href="#playground"
                onClick={() => setActiveTour("Puzzles")}
                className="card-link"
              >
                Try a puzzle <ArrowUpRight size={16} />
              </a>
            </article>
            <article className="feature-card feature-learn">
              <div className="card-top">
                <span className="feature-icon">
                  <BookOpen />
                </span>
                <span className="mini-pill">03 / DISCOVER</span>
              </div>
              <h3>Make the opening yours.</h3>
              <p>111 lessons. A repertoire that sticks.</p>
              <div className="opening-visual">
                <div className="opening-line">
                  <span>e4</span>
                  <i />
                  <span>e5</span>
                  <i />
                  <span>Nf3</span>
                </div>
                <div className="opening-branch">
                  <span />
                  <div>
                    <span className="branch-tile">
                      <Piece piece="bN" />
                      Nc6
                    </span>
                    <span className="branch-tile muted-tile">
                      <Piece piece="bN" />
                      Nf6
                    </span>
                  </div>
                </div>
                <div className="saved-label">
                  <CheckCheck size={16} /> Learn it. Save it. Remember it.
                </div>
              </div>
              <a
                href="#playground"
                onClick={() => setActiveTour("Learn")}
                className="card-link"
              >
                Explore a line <ArrowUpRight size={16} />
              </a>
            </article>
          </div>
          <div className="mini-feature-row">
            {[
              {
                icon: Clock3,
                title: "A clock for real boards",
                text: "Tap. Move. Your time.",
              },
              {
                icon: Target,
                title: "Endgames, unlocked",
                text: "17 hands-on training positions.",
              },
              {
                icon: Trophy,
                title: "Progress you can see",
                text: "Game reviews, stats & achievements.",
              },
              {
                icon: Camera,
                title: "From board to screen",
                text: "Photo recognition · experimental.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div className="mini-feature" key={title}>
                <Icon />
                <div>
                  <h4>{title}</h4>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section id="playground" className="playground-section">
          <div className="section-wrap playground-wrap">
            <div className="playground-intro">
              <span className="eyebrow">LESS SCROLLING. MORE PLAYING.</span>
              <h2>
                Your move.
                <br />
                <span>Yes, right here.</span>
              </h2>
              <p>
                A little taste of NovaChess.
                <br />
                Go on. Give your brain a good time.
              </p>
              <div
                className="tour-tabs"
                onKeyDown={(e) => {
                  const names = ["Analysis", "Puzzles", "Learn"];
                  const current = names.indexOf(activeTour);
                  const next =
                    e.key === "ArrowRight" || e.key === "ArrowDown"
                      ? (current + 1) % 3
                      : e.key === "ArrowLeft" || e.key === "ArrowUp"
                        ? (current + 2) % 3
                        : e.key === "Home"
                          ? 0
                          : e.key === "End"
                            ? 2
                            : -1;
                  if (next >= 0) {
                    e.preventDefault();
                    setActiveTour(names[next]);
                    document.getElementById(`tab-${names[next]}`)?.focus();
                  }
                }}
                role="tablist"
                aria-label="Interactive demos"
              >
                {[
                  { name: "Analysis", icon: ScanLine },
                  { name: "Puzzles", icon: Puzzle },
                  { name: "Learn", icon: BookOpen },
                ].map(({ name, icon: Icon }) => (
                  <button
                    key={name}
                    id={`tab-${name}`}
                    role="tab"
                    tabIndex={activeTour === name ? 0 : -1}
                    aria-selected={activeTour === name}
                    aria-controls={`panel-${name}`}
                    onClick={() => setActiveTour(name)}
                  >
                    <Icon size={18} />
                    {name}
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </div>
              <div className="preview-note">
                <span className="status-dot" /> Interactive web preview
                <span>Full features live in the iPhone app.</span>
              </div>
            </div>
            <div
              className="demo-container"
              id={`panel-${activeTour}`}
              role="tabpanel"
              aria-labelledby={`tab-${activeTour}`}
            >
              <Playground mode={activeTour} />
            </div>
          </div>
        </section>
        <section className="variants section-wrap section-space">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                SAME 64 SQUARES. NEW POSSIBILITIES.
              </span>
              <h2>
                Play outside
                <br />
                <span>the usual moves.</span>
              </h2>
            </div>
            <p>
              Classic when you want it.
              <br />A little chaos when you don’t.
            </p>
          </div>
          <div className="variant-layout">
            <div className="variant-main">
              <div className="variant-art">
                <VariantArt variant={variant} />
              </div>
              <div className="variant-caption">
                <div>
                  <span className="eyebrow">SWITCH UP YOUR GAME</span>
                  <h3>{variant}</h3>
                  <p>{variantCopy[variant]}</p>
                </div>
                <span className="variant-number">
                  0{Object.keys(variantCopy).indexOf(variant) + 1}
                </span>
              </div>
            </div>
            <div className="variant-options">
              {Object.keys(variantCopy).map((v, i) => {
                const Icon = [Crown, EyeOff, Layers3, Flame, Flag][i];
                return (
                  <button
                    className={variant === v ? "active" : ""}
                    key={v}
                    onClick={() => setVariant(v)}
                    aria-pressed={variant === v}
                  >
                    <span className="variant-option-icon">
                      {v === "Duck chess" ? (
                        <img src={`${base}duck.webp`} alt="" />
                      ) : (
                        <Icon />
                      )}
                    </span>
                    <span>
                      {v}
                      <small>
                        {
                          [
                            "The timeless original",
                            "Trust your mind’s eye",
                            "A very different kind of blocker",
                            "Captured pieces. Second chances.",
                            "Race your king to the center.",
                          ][i]
                        }
                      </small>
                    </span>
                    <ArrowUpRight size={20} />
                  </button>
                );
              })}
              <span className="more-variants">
                Plus Atomic, Bughouse, 3-Check, Chess960 & more.
              </span>
            </div>
          </div>
        </section>
        <section id="your-style" className="customize-section">
          <div className="section-wrap customize-wrap">
            <div
              className="style-visual"
              style={
                {
                  "--style-accent": palettes[theme].accent,
                } as React.CSSProperties
              }
            >
              <div className="style-ring" />
              <div className="style-board">
                <Board fen={HERO} theme={theme} />
              </div>
              <span className="style-badge">
                <Palette size={18} /> A little more you.
              </span>
              <span className="style-caption">
                {palettes[theme].name} board palette
              </span>
            </div>
            <div className="customize-copy">
              <span className="eyebrow">YOUR BOARD. YOUR VIBE.</span>
              <h2>
                Chess looks
                <br />
                <span>good on you.</span>
              </h2>
              <p>
                12 board palettes. Six piece sets.
                <br />
                Find your happy place on the board.
              </p>
              <div
                className="swatches"
                role="group"
                aria-label="Board color palette"
              >
                {palettes.map((p, i) => (
                  <button
                    key={p.name}
                    style={{ "--swatch": p.dark } as React.CSSProperties}
                    className={theme === i ? "selected" : ""}
                    onClick={() => setTheme(i)}
                    aria-label={`${p.name} palette`}
                    aria-pressed={theme === i}
                  >
                    {theme === i && <Check size={20} />}
                  </button>
                ))}
              </div>
              <div className="selected-palette">
                {palettes[theme].name}
                <span>Try another color ↑</span>
              </div>
              <div className="style-extras">
                <span>
                  <Volume2 size={16} /> Quiet piano
                </span>
                <span>
                  <Palette size={16} /> Nine app themes
                </span>
                <span>
                  <EyeOff size={16} /> Less distraction
                </span>
              </div>
            </div>
          </div>
        </section>
        <section className="privacy-banner section-wrap">
          <div className="privacy-art">
            <ShieldCheck size={58} strokeWidth={1.4} />
            <span>✓</span>
          </div>
          <div>
            <span className="eyebrow">YOUR GAME IS YOUR BUSINESS.</span>
            <h2>
              More chess.
              <br className="mobile-break" /> Less sharing your data.
            </h2>
            <p>
              No analytics. Local photos. No account needed for offline play.
            </p>
          </div>
          <button className="text-link" onClick={() => setModal("privacy")}>
            The privacy details <ArrowUpRight size={18} />
          </button>
        </section>
        <section id="faq" className="faq section-wrap section-space">
          <div>
            <span className="eyebrow">A FEW GOOD QUESTIONS.</span>
            <h2>
              Before your
              <br />
              <span>first move.</span>
            </h2>
            <div className="faq-decoration">
              <Piece piece="wN" />
              <span>
                Curiosity is
                <br />a good opening.
              </span>
            </div>
          </div>
          <div className="faq-list">
            {faqs.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <Plus className="plus" size={20} />
                  <Minus className="minus" size={20} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="launch-section">
          <div className="launch-checker" />
          <div className="section-wrap launch-content">
            <span className="launch-spark">✦</span>
            <img
              className="launch-icon"
              src={`${base}app-icon.webp`}
              alt="NovaChess app icon"
              width="72"
              height="72"
            />
            <span className="eyebrow">A GOOD MOVE IS ON ITS WAY.</span>
            <h2>
              Your pocket-sized
              <br />
              chess obsession.
            </h2>
            <p>Made for iPhone. Made for your next move.</p>
            <button
              className="button button-cream"
              onClick={() => setModal("launch")}
            >
              <Apple size={21} /> Follow the launch <ArrowUpRight size={18} />
            </button>
            <span className="launch-note">
              In development · iOS 17 and later
            </span>
          </div>
        </section>
      </main>
      <footer className="section-wrap">
        <div className="footer-top">
          <div>
            <Brand />
            <p>A little play. A sharper mind.</p>
          </div>
          <div className="footer-links">
            <a href={APP_SOURCE} target="_blank" rel="noreferrer">
              App source <ArrowUpRight size={13} />
            </a>
            <a href={`${APP_SOURCE}/issues`} target="_blank" rel="noreferrer">
              Say hello <ArrowUpRight size={13} />
            </a>
            <button onClick={() => setModal("privacy")}>Privacy</button>
            <button onClick={() => setModal("credits")}>
              Credits & licenses
            </button>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} NovaChess</span>
          <span>
            Built with a love of the game. <Heart size={12} />
          </span>
          <a href="#">Back to top ↑</a>
        </div>
      </footer>
      <dialog
        ref={modalRef}
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModal(null);
        }}
        aria-labelledby="dialog-title"
      >
        <button
          className="dialog-close icon-button"
          onClick={() => setModal(null)}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
        {modal === "launch" ? (
          <>
            <img className="dialog-icon" src={`${base}app-icon.webp`} alt="" />
            <span className="eyebrow">COMING TO IPHONE</span>
            <h2 id="dialog-title">
              Good things
              <br />
              are in play.
            </h2>
            <p>
              NovaChess is still in development. Follow the project on GitHub
              for release updates.
            </p>
            <a
              className="button"
              href={APP_SOURCE}
              target="_blank"
              rel="noreferrer"
            >
              <Github size={19} /> Follow the project <ArrowUpRight size={16} />
            </a>
            <details className="build-details">
              <summary>
                Want to try the source build?
                <ChevronDown size={16} />
              </summary>
              <p>
                You’ll need a Mac, Xcode 16 or newer, and iOS 17+. Open{" "}
                <code>NovaChess.xcodeproj</code>, select an iPhone simulator and
                run. A physical iPhone needs signing; online features need Apple
                service configuration.
              </p>
              <a
                className="text-link"
                href={`${APP_SOURCE}#open-on-your-mac`}
                target="_blank"
                rel="noreferrer"
              >
                Build instructions <ExternalLink size={14} />
              </a>
            </details>
          </>
        ) : modal === "privacy" ? (
          <>
            <span className="dialog-symbol">
              <ShieldCheck size={32} />
            </span>
            <h2 id="dialog-title">
              Your game.
              <br />
              Your data.
            </h2>
            <div className="policy-content">
              <h3>This website</h3>
              <p>
                No analytics, advertising cookies, accounts or email collection.
                Puzzle progress is kept in this browser’s local storage; use
                “Reset progress” in the puzzle preview to clear it. Hosting
                providers may keep standard request logs.
              </p>
              <h3>The iPhone app</h3>
              <p>
                Photos, repertoire, local games and training progress stay on
                your device. Offline play and analysis need no account.
              </p>
              <h3>When you connect</h3>
              <p>
                Public-game research sends the username you enter to Chess.com
                or Lichess. Creating a NovaChess profile stores public profile
                information and automatically publishes game boards for
                spectating through Apple CloudKit. Game Center handles
                correspondence invitations. Online features require Apple
                services and developer configuration.
              </p>
              <a
                className="text-link"
                href={`${APP_SOURCE}/blob/main/Documentation/PLAYERS_AND_SPECTATING.md`}
                target="_blank"
                rel="noreferrer"
              >
                Read the app’s service details <ArrowUpRight size={15} />
              </a>
            </div>
          </>
        ) : (
          <>
            <span className="dialog-symbol">
              <Heart size={32} />
            </span>
            <h2 id="dialog-title">Good company.</h2>
            <div className="policy-content">
              <p>
                App icon and duck illustration: original NovaChess artwork, used
                from the app source.
              </p>
              <p>
                Chess pieces: Colin M. L. Burnett’s CBurnett set, from Lichess;
                GPL-2.0-or-later, used under GPL-3.0-or-later.{" "}
                <a
                  href={`${base}licenses/chess-pieces-GPL-3.0.txt`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Read license.
                </a>
              </p>
              <p>
                Puzzle examples: Lichess public puzzle dataset, CC0. Each
                example links to its original game.
              </p>
              <p>
                Icons: Lucide (ISC). Website: React, Vite and chess.js. Website
                source is available under AGPL-3.0-or-later.
              </p>
              <p>
                The iPhone app uses Stockfish and Fairy-Stockfish. The web
                preview uses chess.js for legal moves; it does not run these
                engines.
              </p>
              <a
                className="text-link"
                href="https://github.com/Louis2495/NovaChess_website"
                target="_blank"
                rel="noreferrer"
              >
                Website source <ArrowUpRight size={15} />
              </a>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
function ArrowDownIcon() {
  return <ArrowRight className="down-arrow" size={18} />;
}
const variantCopy: Record<string, string> = {
  Standard: "Your favorite game. An opponent at your pace.",
  Blindfold: "No pieces to see. A whole board to imagine.",
  "Duck chess": "Make your move. Then put a duck in the way.",
  Crazyhouse: "Every capture gives you something new to play.",
  "King of the Hill": "Four central squares. One royal destination.",
};
function VariantArt({ variant }: { variant: string }) {
  return (
    <div
      className={`variant-scene ${variant === "Blindfold" ? "blindfold" : ""}`}
    >
      <div className="variant-board">
        <Board
          fen={
            variant === "King of the Hill"
              ? "8/6k1/8/8/3K4/8/8/8 w - - 0 1"
              : HERO
          }
          highlights={
            variant === "King of the Hill" ? ["d4", "e4", "d5", "e5"] : []
          }
        />
      </div>
      {variant === "Duck chess" ? (
        <img
          className="large-duck"
          src={`${base}duck.webp`}
          alt="NovaChess mallard duck chess piece"
        />
      ) : variant === "Blindfold" ? (
        <div className="variant-overlay">
          <EyeOff size={48} />
          <span>See it in your mind.</span>
        </div>
      ) : variant === "Crazyhouse" ? (
        <div className="pocket">
          <span>YOUR POCKET</span>
          <Piece piece="wN" />
          <Piece piece="wP" />
          <Piece piece="wB" />
        </div>
      ) : (
        <div className="oversized-piece">
          <Piece piece={variant === "King of the Hill" ? "wK" : "wN"} />
          <span className="piece-shadow" />
        </div>
      )}
      <span className="scene-spark">✦</span>
    </div>
  );
}
const faqs = [
  [
    "When can I download NovaChess?",
    "NovaChess is in development and isn’t on the App Store yet. Follow the project on GitHub for updates. Developers can already build it with Xcode on a Mac.",
  ],
  [
    "Can I play without an internet connection?",
    "Yes. Computer games, Stockfish analysis, puzzles, opening lessons, your repertoire and endgame training run on-device. Public-game imports, profiles, spectating and correspondence need a connection.",
  ],
  [
    "Is there a subscription?",
    "No subscription or paid analysis API is used in the current app. Release availability and distribution details will be announced when the app is ready.",
  ],
  [
    "Is this good for beginners?",
    "Absolutely. Start with a computer opponent at your pace, build confidence with adaptive puzzles, and learn openings one move at a time. Stronger players can explore full-strength analysis, repertoire training and variants.",
  ],
  [
    "Can it scan my real chessboard?",
    "It can import photos and screenshots for position analysis, but photo recognition is experimental. Review and correct the pieces and position rights before analyzing. Your photos stay on your iPhone.",
  ],
  [
    "What iPhone do I need?",
    "The project targets iPhone with iOS 17 or later. Building from source needs Xcode 16 or newer on a Mac. Camera capture needs a physical iPhone.",
  ],
  [
    "Can I play with friends?",
    "The app includes Game Center correspondence, player profiles and public-game spectating through CloudKit. These online features depend on Apple account access and the developer’s service configuration; they are not a live service on this website.",
  ],
];

const puzzleExamples = [
  {
    id: "037ht",
    fen: "r1b1k1nr/pp2ppbp/2N1q1p1/2p5/8/1P3B2/PBP2P1P/RN1Q1K1R b kq - 5 12",
    setup: "g7b2",
    solution: "d1d8",
    url: "https://lichess.org/fjv40lF6/black#23",
    title: "An open invitation",
    hint: "Your queen has a clear path up the d-file.",
  },
  {
    id: "00XNY",
    fen: "2r5/p4p1k/1p1pq3/2p2p2/7R/2Q4P/1P3PP1/6K1 b - - 1 34",
    setup: "h7g8",
    solution: "c3h8",
    url: "https://lichess.org/eG661aPJ/black#67",
    title: "The long diagonal",
    hint: "The queen and rook can work together on the back rank.",
  },
  {
    id: "05FtN",
    fen: "3Q1r2/1R3p2/3b1kpp/3B4/3p1P2/6P1/4P2P/6K1 b - - 0 30",
    setup: "f8d8",
    solution: "b7f7",
    url: "https://lichess.org/gUH7FFkt/black#59",
    title: "A rook with a view",
    hint: "Move the rook along the seventh rank.",
  },
];
const progressKey = "novachess-web-puzzles-v1";
function readProgress(): string[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(progressKey) || "[]");
    return Array.isArray(data)
      ? data.filter(
          (v): v is string =>
            typeof v === "string" && puzzleExamples.some((p) => p.id === v),
        )
      : [];
  } catch {
    return [];
  }
}
function puzzleStart(index: number) {
  const c = new Chess(puzzleExamples[index].fen);
  c.move(puzzleExamples[index].setup);
  return c.fen();
}
function Playground({ mode }: { mode: string }) {
  return mode === "Puzzles" ? (
    <PuzzleDemo />
  ) : mode === "Learn" ? (
    <LearnDemo />
  ) : (
    <AnalysisDemo />
  );
}
function PuzzleDemo() {
  const [index, setIndex] = useState(0),
    [fen, setFen] = useState(() => puzzleStart(0)),
    [selected, setSelected] = useState<Square | null>(null),
    [message, setMessage] = useState("White to move. Find checkmate in one."),
    [solved, setSolved] = useState(false),
    [hint, setHint] = useState(false),
    [progress, setProgress] = useState<string[]>(readProgress),
    [notation, setNotation] = useState("");
  const puzzle = puzzleExamples[index];
  const chess = new Chess(fen);
  const targets =
    selected && !solved
      ? chess.moves({ square: selected, verbose: true }).map((m) => m.to)
      : [];
  function attempt(from: Square, to: Square) {
    if (solved) return;
    const next = new Chess(fen);
    try {
      const move = next.move({ from, to, promotion: "q" });
      if (next.isCheckmate()) {
        setFen(next.fen());
        setSolved(true);
        setMessage(`${move.san} — checkmate. Nicely spotted!`);
        const updated = [...new Set([...progress, puzzle.id])];
        setProgress(updated);
        try {
          localStorage.setItem(progressKey, JSON.stringify(updated));
        } catch {
          /* Storage can be unavailable in private browsing. */
        }
      } else {
        setMessage("Not quite. Look for a move that gives checkmate.");
      }
    } catch {
      setMessage("That move isn’t legal. Try one of the marked squares.");
    }
    setSelected(null);
  }
  function click(square: Square) {
    if (solved) return;
    const p = chess.get(square);
    if (p?.color === chess.turn()) {
      setSelected(selected === square ? null : square);
      return;
    }
    if (selected) attempt(selected, square);
    else setMessage("Choose a white piece, then its destination.");
  }
  function load(next: number) {
    setIndex(next);
    setFen(puzzleStart(next));
    setSelected(null);
    setSolved(false);
    setHint(false);
    setNotation("");
    setMessage("White to move. Find checkmate in one.");
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = new Chess(fen);
    try {
      const m = next.move(notation.trim());
      attempt(m.from, m.to);
      setNotation("");
    } catch {
      setMessage("Use a legal move, such as Qd8 or d1d8.");
    }
  }
  return (
    <div className="demo-card">
      <div className="demo-heading">
        <div>
          <span className="eyebrow">THE QUICK BRAIN BREAK</span>
          <h3>{puzzle.title}</h3>
        </div>
        <span className="demo-badge">
          <Puzzle size={14} /> {index + 1} / 3
        </span>
      </div>
      <Board
        fen={fen}
        interactive
        selected={selected}
        targets={targets}
        onSquare={click}
        highlights={hint && !solved ? [puzzle.solution.slice(0, 2)] : []}
        label="Puzzle board, white to move"
      />
      <div className={`demo-message ${solved ? "success" : ""}`} role="status">
        {solved ? <Check size={18} /> : <Sparkles size={18} />}
        <span>{message}</span>
      </div>
      {hint && !solved && <p className="hint-message">{puzzle.hint}</p>}
      <div className="demo-actions">
        <button
          className="button button-outline"
          disabled={solved}
          onClick={() => {
            setHint(true);
            setSelected(puzzle.solution.slice(0, 2) as Square);
            setMessage("Hint: start with the highlighted piece.");
          }}
        >
          <Lightbulb size={16} /> Hint
        </button>
        <button
          className="button"
          onClick={() => load((index + 1) % puzzleExamples.length)}
        >
          {solved ? "Next puzzle" : "Skip puzzle"}
          <ArrowRight size={16} />
        </button>
      </div>
      <details className="keyboard-input">
        <summary>
          Prefer to type your move?
          <ChevronDown size={13} />
        </summary>
        <form onSubmit={submit}>
          <label className="sr-only" htmlFor="puzzle-move">
            Chess move in algebraic or coordinate notation
          </label>
          <input
            id="puzzle-move"
            value={notation}
            onChange={(e) => setNotation(e.target.value)}
            placeholder="e.g. Qd8"
            autoComplete="off"
            disabled={solved}
          />
          <button
            className="button button-small"
            disabled={solved || !notation.trim()}
          >
            Play
          </button>
        </form>
      </details>
      <div className="demo-footer">
        <span>{progress.length} / 3 solved in this browser</span>
        <button
          onClick={() => {
            try {
              localStorage.removeItem(progressKey);
            } catch {
              /* Storage is optional. */
            }
            setProgress([]);
            load(0);
          }}
        >
          Reset progress
        </button>
        <a
          href={puzzle.url}
          target="_blank"
          rel="noreferrer"
          aria-label="View original puzzle game on Lichess"
        >
          Lichess <ArrowUpRight size={12} />
        </a>
      </div>
    </div>
  );
}
function AnalysisDemo() {
  const [fen, setFen] = useState(HERO),
    [selected, setSelected] = useState<Square | null>(null),
    [history, setHistory] = useState<string[]>([]),
    [moves, setMoves] = useState<string[]>([]),
    [message, setMessage] = useState("White to move. Pick a piece to explore.");
  const chess = new Chess(fen);
  const targets = selected
    ? chess.moves({ square: selected, verbose: true }).map((m) => m.to)
    : [];
  function click(square: Square) {
    if (chess.get(square)?.color === chess.turn()) {
      setSelected(selected === square ? null : square);
      return;
    }
    if (!selected) return;
    try {
      const move = chess.move({ from: selected, to: square, promotion: "q" });
      setHistory([...history, fen]);
      setFen(chess.fen());
      setMoves([...moves, move.san]);
      setMessage(
        chess.isCheckmate()
          ? "Checkmate. A beautiful finish."
          : chess.isDraw()
            ? "Draw. Try a different line."
            : `${chess.turn() === "w" ? "White" : "Black"} to move.${chess.isCheck() ? " Check!" : ""}`,
      );
    } catch {
      setMessage("Choose one of the marked legal squares.");
    }
    setSelected(null);
  }
  return (
    <div className="demo-card">
      <div className="demo-heading">
        <div>
          <span className="eyebrow">FOLLOW YOUR CURIOSITY</span>
          <h3>What would you play?</h3>
        </div>
        <span className="demo-badge">
          <ScanLine size={14} /> Sandbox
        </span>
      </div>
      <Board
        fen={fen}
        interactive
        selected={selected}
        targets={targets}
        onSquare={click}
        label="Analysis sandbox board"
      />
      <div className="demo-message" role="status">
        <Sparkles size={18} />
        <span>{message}</span>
      </div>
      <div className="move-history" aria-label="Your played moves">
        {moves.length ? (
          moves.map((m, i) => (
            <span key={i}>
              {i % 2 === 0 && <small>{7 + Math.floor(i / 2)}.</small>} {m}
            </span>
          ))
        ) : (
          <span className="muted">Play both sides. Find a new idea.</span>
        )}
      </div>
      <div className="demo-actions">
        <button
          className="button button-outline"
          disabled={!history.length}
          onClick={() => {
            setFen(history[history.length - 1]);
            setHistory(history.slice(0, -1));
            setMoves(moves.slice(0, -1));
            setSelected(null);
            setMessage("Move taken back. Try another idea.");
          }}
        >
          <ArrowLeft size={16} /> Take back
        </button>
        <button
          className="button"
          onClick={() => {
            setFen(HERO);
            setSelected(null);
            setMoves([]);
            setHistory([]);
            setMessage("White to move. Pick a piece to explore.");
          }}
        >
          <RotateCcw size={16} /> Reset board
        </button>
      </div>
      <p className="demo-disclaimer">
        Legal-move preview. Full Stockfish analysis is in the iPhone app.
      </p>
    </div>
  );
}
const openings = [
  {
    name: "Italian Game",
    eco: "C50",
    moves: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Bc5",
      "c3",
      "Nf6",
      "d3",
      "d6",
      "O-O",
      "O-O",
    ],
    idea: "Develop quickly. Aim at f7. Build a strong center.",
  },
  {
    name: "Queen’s Gambit",
    eco: "D06",
    moves: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Be7", "e3", "O-O"],
    idea: "Offer a wing pawn to challenge Black’s center.",
  },
  {
    name: "Sicilian Defense",
    eco: "B20",
    moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"],
    idea: "An unbalanced center. Plenty of room for a plan.",
  },
];
function LearnDemo() {
  const [opening, setOpening] = useState(0),
    [step, setStep] = useState(0);
  const line = openings[opening];
  const c = new Chess();
  let from = "",
    to = "";
  line.moves.slice(0, step).forEach((m) => {
    const move = c.move(m);
    from = move.from;
    to = move.to;
  });
  return (
    <div className="demo-card">
      <div className="demo-heading">
        <div>
          <span className="eyebrow">ONE MOVE AT A TIME</span>
          <h3>Meet your next opening.</h3>
        </div>
        <GraduationCap size={24} />
      </div>
      <div className="opening-select">
        <label className="sr-only" htmlFor="opening">
          Choose an opening
        </label>
        <select
          id="opening"
          value={opening}
          onChange={(e) => {
            setOpening(Number(e.target.value));
            setStep(0);
          }}
        >
          {openings.map((o, i) => (
            <option key={o.name} value={i}>
              {o.name} · {o.eco}
            </option>
          ))}
        </select>
      </div>
      <Board
        fen={c.fen()}
        highlights={[from, to]}
        label={`${line.name}, ${step} half moves played`}
      />
      <div className="lesson-progress">
        <span style={{ width: `${(step / line.moves.length) * 100}%` }} />
      </div>
      <div className="lesson-move" role="status">
        <b>
          {step
            ? `${Math.ceil(step / 2)}${step % 2 === 0 ? "…" : "."} ${line.moves[step - 1]}`
            : "The starting position"}
        </b>
        <span>
          {step} / {line.moves.length} half-moves
        </span>
      </div>
      <p className="opening-idea">{line.idea}</p>
      <div className="demo-actions">
        <button
          className="button button-outline"
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
        >
          <ChevronLeft size={16} /> Back
        </button>
        <button
          className="button"
          onClick={() => setStep(step === line.moves.length ? 0 : step + 1)}
        >
          {step === line.moves.length ? "Play again" : "Next move"}
          {step === line.moves.length ? (
            <RotateCcw size={16} />
          ) : (
            <ArrowRight size={16} />
          )}
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
