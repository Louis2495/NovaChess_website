import { useEffect, useRef, useState } from "react";
import { emptyLibrary } from "./store";
import type { Library } from "./types";

const storageKey = "novachess-library-v2";
type GameArchive = Pick<Library, "games" | "activeGame">;
let database: Promise<IDBDatabase> | undefined;

function openArchive() {
  return database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("novachess-game-library", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("archive");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function updateArchive(update: (archive?: GameArchive) => GameArchive) {
  const db = await openArchive();
  return new Promise<GameArchive>((resolve, reject) => {
    const transaction = db.transaction("archive", "readwrite");
    const store = transaction.objectStore("archive");
    let result: GameArchive;
    const request = store.get("games");
    request.onsuccess = () => {
      result = update(request.result);
      store.put(result, "games");
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(transaction.error);
  });
}

function mergeArchive(stored: GameArchive, previous: GameArchive, current: GameArchive): GameArchive {
  const old = new Map(previous.games.map(game => [game.id, game]));
  const currentIds = new Set(current.games.map(game => game.id));
  const changed = current.games.filter(game => old.get(game.id) !== game);
  const changedIds = new Set(changed.map(game => game.id));
  const untouched = stored.games.filter(game =>
    !changedIds.has(game.id) && (!old.has(game.id) || currentIds.has(game.id)));
  return {
    games: [...changed, ...untouched].sort((a, b) => b.created - a.created),
    activeGame: previous.activeGame === current.activeGame ? stored.activeGame : current.activeGame,
  };
}

function readLegacyLibrary(): Library {
  try {
    const snapshot = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return emptyLibrary;
    return { ...emptyLibrary, ...snapshot, games: Array.isArray(snapshot.games) ? snapshot.games : [] };
  } catch {
    return emptyLibrary;
  }
}

export function useGameLibrary() {
  const [library, setLibrary] = useState(readLegacyLibrary);
  const [ready, setReady] = useState(false);
  const [archiveAvailable, setArchiveAvailable] = useState(true);
  const initial = useRef(library);
  const previous = useRef<GameArchive>(library);
  const pendingWrite = useRef<Promise<unknown>>(Promise.resolve());
  const compactOnly = useRef(false);
  const latest = useRef(library);
  latest.current = library;

  useEffect(() => {
    let active = true;
    const legacy = initial.current;
    void updateArchive(stored => stored ?? { games: legacy.games, activeGame: legacy.activeGame })
      .then(stored => {
        if (!active) return;
        previous.current = stored;
        setLibrary(current => ({
          ...current,
          ...(current.games === legacy.games && current.activeGame === legacy.activeGame
            ? stored : mergeArchive(stored, legacy, current)),
        }));
      })
      .catch(() => { if (active) setArchiveAvailable(false); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const archive = { games: library.games, activeGame: library.activeGame };
    const baseline = previous.current;
    const changed = baseline.games !== archive.games || baseline.activeGame !== archive.activeGame;
    if (changed) previous.current = archive;

    function writeBrowserCopy(snapshot: Library) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(snapshot));
        return true;
      } catch {
        return false;
      }
    }
    function warn() {
      if (latest.current !== library) return;
      window.dispatchEvent(new CustomEvent("storage-warning", {
        detail: "Browser storage is full or unavailable. Export a backup before leaving.",
      }));
    }
    const fullCopySaved = (!archiveAvailable || !compactOnly.current) && writeBrowserCopy(library);
    if (!archiveAvailable) {
      if (!fullCopySaved) warn();
      return;
    }
    if (changed) {
      // Transactions merge per-game edits so another open tab's games survive.
      pendingWrite.current = updateArchive(stored => stored ? mergeArchive(stored, baseline, archive) : archive);
    }
    void pendingWrite.current.then(() => {
      if (latest.current !== library || fullCopySaved) return;
      compactOnly.current = true;
      if (!writeBrowserCopy({ ...library, ...emptyArchive })) warn();
    }).catch(() => {
      setArchiveAvailable(false);
      if (!fullCopySaved) warn();
    });
  }, [library, ready, archiveAvailable]);

  return [library, setLibrary] as const;
}

const emptyArchive: GameArchive = { games: [], activeGame: null };
