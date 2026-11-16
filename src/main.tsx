import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Home,
  ScanLine,
  MonitorPlay,
  Puzzle,
  BookOpen,
  FolderOpen,
  ChartNoAxesCombined,
  Users,
  Search,
  ChevronRight,
  X,
  Command,
  ShieldCheck,
  Menu,
  UserRound,
  Keyboard,
  Trophy,
} from "lucide-react";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import { AppContext } from "./lib/context";
import {
  defaults,
  emptyLibrary,
  usePersistent,
  base,
  APP_SOURCE,
  contrast,
} from "./lib/store";
import type { Appearance as AppearanceType, Library, Tab } from "./lib/types";
import { IconButton, Modal, Loading, External } from "./components/UI";
import Appearance from "./components/Appearance";
import HomePage from "./pages/Home";
import "./styles.css";
import "./redesign.css";
const Analysis = lazy(() => import("./pages/Analysis")),
  Play = lazy(() => import("./pages/Play")),
  Puzzles = lazy(() => import("./pages/Puzzles")),
  Research = lazy(() => import("./pages/Research")),
  Controls = lazy(() => import("./pages/Controls")),
  Rankings = lazy(() => import("./pages/Rankings")),
  ProfilePage = lazy(() => import("./pages/Profile")),
  Learn = lazy(() => import("./pages/Learn")),
  LibraryPage = lazy(() => import("./pages/Library")),
  Stats = lazy(() => import("./pages/Stats")),
  Community = lazy(() => import("./pages/Community"));
const mainNav = [
  { id: "home", label: "Home", icon: Home },
  { id: "analysis", label: "Analysis", icon: ScanLine },
  { id: "play", label: "Play", icon: MonitorPlay },
  { id: "puzzles", label: "Puzzles", icon: Puzzle },
  { id: "learn", label: "Learn", icon: BookOpen },
  { id: "research", label: "Research", icon: Search },
  { id: "stats", label: "Stats", icon: ChartNoAxesCombined },
] as const;
const secondaryNav = [
  { id: "controls", label: "Controls", icon: Keyboard },
  { id: "rankings", label: "Rankings", icon: Trophy },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "library", label: "Saved games", icon: FolderOpen },
  { id: "community", label: "Multiplayer", icon: Users },
] as const;
const validTabs = new Set([...mainNav, ...secondaryNav].map((v) => v.id));
function route() {
  const [tab, ...rest] = location.hash.slice(1).split("/");
  let detail = "";
  try {
    detail = decodeURIComponent(rest.join("/"));
  } catch {}
  return {
    tab: validTabs.has(tab as Tab) ? (tab as Tab) : ("home" as Tab),
    detail,
  };
}
function App() {
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
    [message, setMessage] = useState(""),
    [showMenu, setShowMenu] = useState(false),
    [command, setCommand] = useState(false),
    [query, setQuery] = useState(""),
    [info, setInfo] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const musicReady = useRef<Promise<void> | null>(null);
  const { tab, detail } = locationState;
  const notify = (text: string) => setMessage(text);
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
    const sound = () => {
      if (!appearance.sound || !appearance.volume) return;
      try {
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
      void ctx?.close();
    };
  }, [appearance.sound, appearance.volume]);
  useEffect(() => {
    setAppearance((a) =>
      ["#101418", "#101612"].includes(a.backgroundColor) &&
      ["#1b2126", "#1c271f"].includes(a.panelColor) &&
      ["#f0f3f1", "#eef4ed"].includes(a.textColor) &&
      ["#a6b0aa", "#abb8aa"].includes(a.mutedColor)
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
    document.title = `${[...mainNav, ...secondaryNav].find((v) => v.id === tab)?.label || "Home"} · NovaChess`;
  }, [tab]);

  const panelHex = appearance.panelColor.replace("#", "");
  const panelRgb = [0, 2, 4]
    .map((i) => parseInt(panelHex.slice(i, i + 2), 16))
    .join(",");
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
    "--board-max": `${appearance.boardSize}px`,
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
  const page =
    tab === "home" ? (
      <HomePage />
    ) : tab === "analysis" ? (
      <Analysis />
    ) : tab === "play" ? (
      <Play />
    ) : tab === "puzzles" ? (
      <Puzzles />
    ) : tab === "learn" ? (
      <Learn />
    ) : tab === "research" ? (
      <Research />
    ) : tab === "controls" ? (
      <Controls />
    ) : tab === "rankings" ? (
      <Rankings />
    ) : tab === "profile" ? (
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
        className={`app ${appearance.animation ? "" : "no-motion"} bg-${appearance.background.toLowerCase()}`}
        style={style}
      >
        <div className="site-background" aria-hidden="true" />
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
          </nav>
          <div className="sidebar-label">LIBRARY</div>
          <nav aria-label="Library navigation">
            {secondaryNav.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={tab === id ? "active" : ""}
                onClick={() => navigate(id)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
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
                  library.profile.name.slice(0, 1).toUpperCase()
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
            <span className="mobile-wordmark">NovaChess</span>
            <button
              className="global-search"
              aria-label="Search tools and openings"
              onClick={() => setCommand(true)}
            >
              <Search size={16} />
              <span>Search</span>
              <kbd>
                <Command size={10} /> K
              </kbd>
            </button>
            <div className="topbar-right"></div>
          </header>
          <main id="workspace" tabIndex={-1} className="workspace">
            <Suspense fallback={<Loading />}>
              <div key={`${tab}:${detail}`}>{page}</div>
            </Suspense>
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
              {[...mainNav, ...secondaryNav]
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
