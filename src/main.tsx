import {useOnlineSession} from "./lib/online";
import GlobalChat from "./components/GlobalChat";
import React, { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Home,
  Shapes,
  ScanLine,
  MonitorPlay,
  Puzzle,
  BookOpen,
  FolderOpen,
  ChartNoAxesCombined,
  Search,
  ChevronRight,
  X,
  ShieldCheck,
  Menu,
} from "lucide-react";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/nunito-sans/latin-400.css";
import "@fontsource/nunito-sans/latin-500.css";
import "@fontsource/nunito-sans/latin-600.css";
import "@fontsource/nunito-sans/latin-700.css";
import "@fontsource/nunito-sans/latin-900.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import { AppContext } from "./lib/context";
import {
  defaults,
  emptyLibrary,
  usePersistent,
  annotationColors,
  base,
  APP_SOURCE,
  contrast,
  pieceUrl,
  boardSizeKey,
} from "./lib/store";
import type { Appearance as AppearanceType, Library, Tab } from "./lib/types";
import { IconButton, Modal, Loading, External } from "./components/UI";
import WorkspaceShortcuts from "./components/WorkspaceShortcuts";
import Appearance from "./components/Appearance";
import HomePage from "./pages/Home";
import "./styles.css";
import "./redesign.css";
const SignIn = lazy(() => import("./pages/SignIn")),
  Analysis = lazy(() => import("./pages/Analysis")),
  Play = lazy(() => import("./pages/PlayHub")),
  Puzzles = lazy(() => import("./pages/Puzzles")),
  Research = lazy(() => import("./pages/Research")),
  ProfilePage = lazy(() => import("./pages/Profile")),
  Learn = lazy(() => import("./pages/Learn")),
  LibraryPage = lazy(() => import("./pages/Library")),
  Stats = lazy(() => import("./pages/Stats")),
  Community = lazy(() => import("./pages/Community"));
const mainNav = [
  { id: "home", label: "Home", icon: Home },
  { id: "analysis", label: "Analysis", icon: ScanLine },
  { id: "play", label: "Play", icon: MonitorPlay },
  { id: "variants", label: "Variants", icon: Shapes },
  { id: "puzzles", label: "Puzzles", icon: Puzzle },
  { id: "learn", label: "Learn", icon: BookOpen },
  { id: "research", label: "Research", icon: Search },
  { id: "stats", label: "Stats", icon: ChartNoAxesCombined },
  { id: "library", label: "Library", icon: FolderOpen },
] as const;
const validTabs = new Set<string>([
  "profile",
  "signin",
  "controls",
  "rankings",
  "community",
  ...mainNav.map((v) => v.id),
]);
function route() {
  const [tab, ...rest] = location.hash.slice(1).split("/");
  let detail = "";
  try {
    detail = decodeURIComponent(rest.join("/"));
  } catch {}
  return {
    tab:
      tab === "rankings"
        ? ("stats" as Tab)
        : tab === "controls"
          ? ("profile" as Tab)
          : validTabs.has(tab)
            ? (tab as Tab)
            : ("home" as Tab),
    detail:
      tab === "rankings"
        ? "rankings"
        : tab === "controls"
          ? "controls"
          : detail,
  };
}
function App() {
  const {session,ready:authReady}=useOnlineSession();
  const appRoot = useRef<HTMLDivElement>(null);
  const [appearance, setAppearance] = usePersistent<AppearanceType>(
      "novachess-appearance-v2",
      defaults,
    ),
    [library, setLibrary] = usePersistent<Library>(
      "novachess-library-v2",
      emptyLibrary,
    ),
    [locationState, setLocation] = useState(route),
    [showAppearance, setShowAppearance] = useState(false),
    [researchVisited, setResearchVisited] = useState(
      () => route().tab === "research",
    ),
    [focusMode, setFocusMode] = useState(false),
    [message, setMessage] = useState(""),
    [showMenu, setShowMenu] = useState(false),
    [command, setCommand] = useState(false),
    [query, setQuery] = useState(""),
    [info, setInfo] = useState(false);
  useEffect(() => {
    setAppearance(a => a.background === "Default" && a.backgroundColor === "#252e3a" && a.panelColor === "#354354" ? {
      ...a, backgroundColor:defaults.backgroundColor, panelColor:defaults.panelColor,
      ...(a.theme === "Steel" && a.accent === "#b2d3e7" ? {theme:defaults.theme,accent:defaults.accent} : {}),
      ...(a.buttonColor === "#a7bfd6" ? {buttonColor:defaults.buttonColor} : {}),
      ...(a.radius === 16 ? {radius:defaults.radius} : {}),
    } : a);
  }, []);
  useEffect(() => {
    // Refresh only the previous default board/colors, preserving custom choices.
    setAppearance((a) => {
      const oldMarks = {
        green: ["#63d6a1", "#187b46"], blue: ["#67b8ff", "#205eab"],
        red: ["#ff7b92", "#b3334a"], gold: ["#ffd071", "#b76808"],
      };
      const newMarks = annotationColors;
      const marks = a.markColors ? { ...a.markColors } : undefined;
      let changed = false;
      for (const key of Object.keys(oldMarks) as (keyof typeof oldMarks)[]) {
        if (marks?.[key] && oldMarks[key].includes(marks[key])) {
          marks[key] = newMarks[key];
          changed = true;
        }
      }
      const board = a.board === "Classic" && a.dark.toLowerCase() === "#5c7866";
      const font = ["Manrope", "Nunito Sans"].includes(a.font) && !a.fontCustomized;
      return board || changed || font
        ? {
            ...a,
            ...(board ? { dark: defaults.dark } : {}),
            ...(font ? { font: defaults.font } : {}),
            ...(changed ? { markColors: marks } : {}),
          }
        : a;
    });
  }, []);
  useEffect(() => {
    if (locationState.tab === "research") setResearchVisited(true);
  }, [locationState.tab]);
  function toggleFocus() {
    if (focusMode) {
      setFocusMode(false);
      return;
    }
    const active = document.activeElement?.closest<HTMLElement>(
      ".board-frame:not(.compact-frame)",
    );
    const frame =
      active ||
      Array.from(
        document.querySelectorAll<HTMLElement>(
          "#workspace .board-frame:not(.compact-frame)",
        ),
      ).find((e) => !e.closest("[hidden]"));
    if (!frame) {
      setMessage("Open a board to use focus mode.");
      return;
    }
    frame.dataset.focusBoard = "true";
    setFocusMode(true);
  }
  useEffect(() => {
    if (!focusMode)
      document
        .querySelectorAll("[data-focus-board]")
        .forEach((e) => e.removeAttribute("data-focus-board"));
    const previous = document.body.style.overflow;
    if (focusMode) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [focusMode]);
  useEffect(
    () => setFocusMode(false),
    [locationState.tab, locationState.detail],
  );
  const audio = useRef<HTMLAudioElement | null>(null);
  const musicReady = useRef<Promise<void> | null>(null);
  const { tab, detail } = locationState;
  const notify = (text: string) => {
    if (
      !/illegal move|move is not legal|drop is not legal|premove is unavailable/i.test(
        text,
      )
    )
      setMessage(text);
  };
  function navigate(tab: Tab, detail = "") {
    location.hash = tab + (detail ? "/" + encodeURIComponent(detail) : "");
    setLocation({ tab, detail });
    setShowMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  useEffect(() => {
    const handler = () => setLocation(route());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(""), 6500);
    return () => clearTimeout(id);
  }, [message]);
  useEffect(() => {
    const storage = (e: Event) => notify((e as CustomEvent).detail);
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommand((v) => !v);
      }
    };
    window.addEventListener("storage-warning", storage);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("storage-warning", storage);
      window.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => {
    let canceled = false;
    if (appearance.music) {
      if (!audio.current) {
        audio.current = new Audio();
        audio.current.loop = true;
      }
      const player = audio.current;
      player.volume = appearance.volume;
      if (!musicReady.current)
        musicReady.current = fetch(`${base}piano.mp3`)
          .then((r) => {
            if (!r.ok)
              throw new Error(
                "Piano recording is unavailable. Connect once to download it.",
              );
            return r.blob();
          })
          .then((blob) => {
            player.src = URL.createObjectURL(blob);
          })
          .catch((error) => {
            musicReady.current = null;
            throw error;
          });
      void musicReady.current
        .then(() => {
          if (!canceled) return player.play();
        })
        .catch((error) => {
          if (!canceled) {
            notify(
              error.message || "Tap the piano toggle again to allow audio.",
            );
            setAppearance((a) => ({ ...a, music: false }));
          }
        });
    } else audio.current?.pause();
    return () => {
      canceled = true;
    };
  }, [appearance.music, appearance.volume]);
  useEffect(() => {
    let ctx: AudioContext | null = null;
    const custom = appearance.customMoveSound ? new Audio(appearance.customMoveSound) : null;
    const sound = () => {
      if (!appearance.sound || !appearance.volume) return;
      try {
        if (custom) { custom.volume = appearance.volume; custom.currentTime = 0; void custom.play().catch(() => {}); return; }
        ctx = ctx || new AudioContext();
        void ctx.resume();
        const oscillator = ctx.createOscillator(),
          gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(600, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
          300,
          ctx.currentTime + 0.07,
        );
        gain.gain.setValueAtTime(appearance.volume * 0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.09);
      } catch {}
    };
    window.addEventListener("chess-move", sound);
    return () => {
      window.removeEventListener("chess-move", sound);
      custom?.pause();
      void ctx?.close();
    };
  }, [appearance.sound, appearance.volume, appearance.customMoveSound]);
  useEffect(() => {
    setAppearance((a) =>
      a.background === "Default" &&
      a.backgroundColor === "#292d43" &&
      a.panelColor === "#3b425d"
        ? {
            ...a,
            backgroundColor: defaults.backgroundColor,
            panelColor: defaults.panelColor,
            textColor:
              a.textColor === "#fbf8ff" ? defaults.textColor : a.textColor,
            mutedColor:
              a.mutedColor === "#c6c7dc" ? defaults.mutedColor : a.mutedColor,
            theme: a.theme === "Periwinkle" ? defaults.theme : a.theme,
            accent: a.accent === "#c7c1ff" ? defaults.accent : a.accent,
            buttonColor: ["#b7c7ed", "#f1bb98"].includes(a.buttonColor)
              ? defaults.buttonColor
              : a.buttonColor,
          }
        : a.buttonColor === "#f1bb98"
          ? { ...a, buttonColor: defaults.buttonColor }
          : a.background === "Default" &&
              a.backgroundColor === "#20313b" &&
              a.panelColor === "#304651" &&
              a.textColor === "#f4f8f5" &&
              a.mutedColor === "#b5c8c5"
            ? {
                ...a,
                backgroundColor: defaults.backgroundColor,
                panelColor: defaults.panelColor,
                textColor: defaults.textColor,
                mutedColor: defaults.mutedColor,
                theme:
                  a.theme === "Forest" && a.accent === "#96d9b8"
                    ? defaults.theme
                    : a.theme,
                accent:
                  a.theme === "Forest" && a.accent === "#96d9b8"
                    ? defaults.accent
                    : a.accent,
                buttonColor:
                  a.theme === "Forest" &&
                  a.accent === "#96d9b8" &&
                  a.buttonColor === "#96d9b8"
                    ? defaults.buttonColor
                    : a.buttonColor,
              }
            : a.backgroundColor === "#80350d"
              ? { ...a, backgroundColor: defaults.backgroundColor }
              : ["#101418", "#101612", "#19262e"].includes(a.backgroundColor) &&
                  ["#1b2126", "#1c271f", "#263840"].includes(a.panelColor) &&
                  ["#f0f3f1", "#eef4ed", "#f4f8f5"].includes(a.textColor) &&
                  ["#a6b0aa", "#abb8aa", "#b5c8c5"].includes(a.mutedColor)
                ? {
                    ...a,
                    backgroundColor: defaults.backgroundColor,
                    panelColor: defaults.panelColor,
                    textColor: defaults.textColor,
                    mutedColor: defaults.mutedColor,
                    accent: a.accent === "#78b58a" ? defaults.accent : a.accent,
                    buttonColor:
                      a.buttonColor === "#78b58a"
                        ? defaults.buttonColor
                        : a.buttonColor,
                    font: a.font === "DM Sans" ? defaults.font : a.font,
                  }
                : a,
    );
  }, []);
  useEffect(() => {
    document.documentElement.style.fontSize = `${appearance.fontSize}px`;
  }, [appearance.fontSize]);
  useEffect(() => {
    document
      .querySelector("meta[name=theme-color]")
      ?.setAttribute("content", appearance.backgroundColor);
  }, [appearance.backgroundColor]);
  useEffect(() => {
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register(`${base}sw.js`, { scope: base })
        .catch(() => {});
    }
  }, []);
  useEffect(() => {
    document.title = `${mainNav.find((v) => v.id === tab)?.label || "Home"} · NovaChess`;
  }, [tab]);

  const panelHex = appearance.panelColor.replace("#", "");
  const panelRgb = [0, 2, 4]
    .map((i) => parseInt(panelHex.slice(i, i + 2), 16))
    .join(",");
  const manualBoardSize =
    appearance.boardSizes?.[boardSizeKey(tab, detail)] ??
    appearance.globalBoardSize;
  const style = {
    "--accent": appearance.accent,
    "--accent-soft": `${appearance.accent}20`,
    "--button": appearance.buttonColor,
    "--button-text": contrast(appearance.buttonColor),
    "--text": appearance.textColor,
    "--muted": appearance.mutedColor,
    "--panel": `rgba(${panelRgb},${appearance.panelOpacity / 100})`,
    "--panel-solid": appearance.panelColor,
    "--base": appearance.backgroundColor,
    "--radius": `${appearance.radius}px`,
    "--font": appearance.font,
    "--font-size": `${appearance.fontSize}px`,
    "--space":
      appearance.density === "Compact"
        ? "14px"
        : appearance.density === "Spacious"
          ? "28px"
          : "21px",
    "--board-max": `${manualBoardSize || appearance.boardSize}px`,
    "--analysis-board-size": manualBoardSize
      ? `${manualBoardSize}px`
      : `min(${appearance.boardSize}px, max(220px, calc(100dvh - 350px)))`,
    "--play-board-size": manualBoardSize
      ? `${manualBoardSize}px`
      : "calc(100dvh - 150px)",
    "--background-dim": `${appearance.backgroundDim / 100}`,
    "--background-blur": `${appearance.backgroundBlur}px`,
    "--background-image":
      appearance.background === "Flag" &&
      /^[A-Z]{2}$/.test(appearance.flag || "")
        ? `url("${base}flags/${appearance.flag!.toLowerCase()}.svg")`
        : appearance.customBackground
          ? `url("${appearance.customBackground}")`
          : "none",
  } as React.CSSProperties;
  useLayoutEffect(() => {
    const root = appRoot.current;
    if (!root) return;
    // A route change can interrupt a drag before its release event.
    root.classList.toggle("manual-boards", !!manualBoardSize);
    for (const key of ["--board-max", "--analysis-board-size", "--play-board-size"])
      root.style.setProperty(key, (style as React.CSSProperties & Record<string, string>)[key]);
  }, [tab, detail]);
  const page =
    tab === "home" ? (
      <HomePage />
    ) : tab === "analysis" ? (
      <Analysis />
    ) : tab === "play" ? (
      <Play key="standard" />
    ) : tab === "variants" ? (
      <Play key="variants" variants />
    ) : tab === "puzzles" ? (
      <Puzzles />
    ) : tab === "learn" ? (
      <Learn />
    ) : tab === "research" ? null : tab === "signin" ? <SignIn/> : tab === "profile" ? (
      <ProfilePage />
    ) : tab === "library" ? (
      <LibraryPage />
    ) : tab === "stats" ? (
      <Stats />
    ) : tab === "community" ? (
      <Community />
    ) : (
      <Community />
    );
  return (
    <AppContext.Provider
      value={{
        appearance,
        setAppearance,
        library,
        setLibrary,
        navigate,
        tab,
        detail,
        notify,
        openAppearance: () => setShowAppearance(true),
      }}
    >
      <div
        ref={appRoot}
        className={`app ${manualBoardSize ? "manual-boards" : ""} ${focusMode ? "focus-mode" : ""} ${appearance.animation ? "" : "no-motion"} bg-${appearance.background.toLowerCase()}`}
        style={style}
      >
        <WorkspaceShortcuts
          toggleFocus={toggleFocus}
          exitFocus={() => setFocusMode(false)}
          openSearch={() => setCommand(true)}
        />
        {focusMode && (
          <button
            className="exit-focus icon-btn"
            aria-label="Exit focus mode"
            onClick={() => setFocusMode(false)}
          >
            <X size={20} />
          </button>
        )}
        <div className="site-background" aria-hidden="true" />
        <GlobalChat />
        {authReady && !session && tab !== "signin" && !focusMode && <button className="floating-sign-in btn" onClick={()=>navigate("signin")}>Sign in</button>}
        <a className="skip-link" href="#workspace">
          Skip to workspace
        </a>
        <aside className={`sidebar ${showMenu ? "open" : ""}`}>
          <button
            className="brand"
            onClick={() => navigate("home")}
            aria-label="NovaChess home"
          >
            <img src={`${base}app-icon.webp`} alt="" />
            <span>NovaChess</span>
          </button>

          <nav aria-label="Main navigation">
            {mainNav.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={tab === id ? "active" : ""}
                aria-current={tab === id ? "page" : undefined}
                onClick={() => navigate(id)}
              >
                <Icon size={19} />
                <span>{label}</span>
                {tab === id && <span className="nav-dot" />}
              </button>
            ))}
            <div id="sidebar-chat" />
          </nav>
          <div className="sidebar-bottom">
            <button
              className="account-stamp"
              onClick={() => navigate("profile")}
              aria-label="Open profile"
            >
              <span className="avatar">
                {library.profile.avatar ? (
                  <img src={library.profile.avatar} alt="" />
                ) : (
                  <img
                    src={pieceUrl("wP", "Chessnut")}
                    className="default-avatar"
                    alt=""
                  />
                )}
              </span>
              <span>{library.profile.name}</span>
            </button>
            <div className="sidebar-footer">
              <button onClick={() => setInfo(true)}>
                <ShieldCheck size={13} /> Privacy & source
              </button>
              <span>v2.0</span>
            </div>
          </div>
        </aside>
        {showMenu && (
          <button
            className="sidebar-scrim"
            onClick={() => setShowMenu(false)}
            aria-label="Close navigation"
          />
        )}
        <div className="workspace-shell">
          <header className="topbar">
            <IconButton
              label="Open navigation"
              className="mobile-menu"
              onClick={() => setShowMenu(!showMenu)}
            >
              <Menu size={21} />
            </IconButton>
            <span className="mobile-wordmark"><img src={`${base}app-icon.webp`} alt="" />NovaChess</span>
            <div className="topbar-right"></div>
          </header>
          <main id="workspace" tabIndex={-1} className="workspace">
            <div key="page-view">
              <Suspense fallback={<Loading />}>
                <div key={`${tab}:${detail}`}>{page}</div>
              </Suspense>
            </div>
            {(researchVisited || tab === "research") && (
              <div key="research-view" hidden={tab !== "research"}>
                <Suspense fallback={<Loading />}>
                  <Research />
                </Suspense>
              </div>
            )}
          </main>
        </div>
        <nav className="mobile-tabs" aria-label="App tabs">
          {mainNav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        {showAppearance && (
          <Appearance onClose={() => setShowAppearance(false)} />
        )}{" "}
        {message && (
          <div className="toast" role="status">
            <span>{message}</span>
            <IconButton label="Dismiss message" onClick={() => setMessage("")}>
              <X size={16} />
            </IconButton>
          </div>
        )}
        {command && (
          <Modal title="Search" onClose={() => setCommand(false)}>
            <input
              autoFocus
              className="command-input"
              aria-label="Search tools and openings"
              placeholder="Analysis, puzzles, openings…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="command-results">
              {mainNav
                .filter((n) =>
                  n.label.toLowerCase().includes(query.toLowerCase()),
                )
                .map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      navigate(id);
                      setCommand(false);
                    }}
                  >
                    <Icon size={18} />
                    {label}
                    <ChevronRight size={15} />
                  </button>
                ))}
              <button
                onClick={() => {
                  navigate("learn", "search:" + query);
                  setCommand(false);
                }}
              >
                <BookOpen size={18} />
                Search opening library
                <ChevronRight size={15} />
              </button>
            </div>
          </Modal>
        )}
        {info && (
          <Modal title="Privacy & source" onClose={() => setInfo(false)}>
            <div className="prose">
              <p>
                Games, repertoire, profiles and preferences are saved locally in
                this browser. Optional online accounts, multiplayer games, chat
                and rankings use the connected Supabase project. No analytics or
                advertising cookies are used.
              </p>
              <p>
                Public-game research contacts only the Chess.com or Lichess
                account you request. A shared position link contains its
                position; game files contain the moves and player information
                you export.
              </p>
              <p>
                Stockfish 19 Lite runs locally for standard analysis and play.
                Variant rules use Fairy-Stockfish WebAssembly; variant opponents
                use a separate lightweight local search. They are not calibrated
                human ratings.
              </p>
              <p>
                The iPhone app’s CloudKit and Game Center are native-only.
                Online web features use separate NovaChess accounts.
              </p>
              <p>
                Artwork, chess pieces, puzzles, lessons and piano recordings are
                attributed in the repository. Pieces: CBurnett, Merida, Spatial,
                Fantasy, Chessnut and Celtic. Website source: AGPL-3.0-or-later.
              </p>
              <External href="https://github.com/Louis2495/NovaChess_website">
                Website source & notices
              </External>
              <External href={APP_SOURCE}>iPhone app source</External>
            </div>
          </Modal>
        )}
      </div>
    </AppContext.Provider>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
