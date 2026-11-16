import { useEffect, useRef, useState } from "react";
import { useApp } from "./context";
import { previewPremoves, premoveOptions, type PremoveSide } from "./premoves";
export function usePremoves({
  fen,
  side,
  legal,
  enabled = true,
  active = true,
  identity,
  execute,
  chaos = false,
  blocked = [],
}: {
  fen: string;
  side: PremoveSide;
  legal: string[];
  enabled?: boolean;
  active?: boolean;
  identity?: string;
  execute: (move: string) => void | Promise<unknown>;
  chaos?: boolean;
  blocked?: string[];
}) {
  const { appearance, notify } = useApp();
  const [queue, setQueue] = useState<string[]>([]),
    [sent, setSent] = useState<{ fen: string; move: string } | null>(null);
  const generation = useRef(0);
  const last = useRef(""),
    fn = useRef(execute);
  fn.current = execute;
  const allowed = enabled && appearance.premoves && active,
    turn = fen.split(" ")[1];
  useEffect(() => {
    setQueue([]);
    setSent(null);
    last.current = "";
    generation.current++;
    return () => {
      generation.current++;
    };
  }, [identity]);
  useEffect(() => {
    if (!allowed) {
      setQueue([]);
      setSent(null);
    }
  }, [allowed]);
  useEffect(() => {
    if (!allowed || turn !== side || !queue.length || last.current === fen)
      return;
    const wanted = queue[0],
      move = legal.find((m) => m === wanted || m === wanted + "q");
    if (!move) {
      setQueue([]);
      setSent(null);
      notify("Premove is no longer legal. Queue cleared.");
      return;
    }
    last.current = fen;
    const epoch = generation.current,
      run = fn.current;
    Promise.resolve()
      .then(() => {
        if (epoch === generation.current) return run(move);
      })
      .then(() => {
        if (epoch !== generation.current) return;
        setQueue((q) => (q[0] === wanted ? q.slice(1) : q));
        setSent({ fen, move });
      })
      .catch((e) => {
        if (epoch !== generation.current) return;
        setQueue([]);
        setSent(null);
        notify((e as Error).message);
      });
  }, [allowed, turn, side, fen, legal, queue]);
  const pending = sent?.fen === fen ? [sent.move, ...queue] : queue,
    preview =
      allowed && (pending.length || turn !== side)
        ? previewPremoves(fen, pending, side)
        : fen;
  return {
    queue,
    setQueue,
    cancelOnRightClick: () => {
      if (!queue.length && sent?.fen !== fen) return false;
      setQueue([]);
      setSent(null);
      return true;
    },
    enqueue: (m: string) => {
      if (!allowed) return;
      setQueue((q) => (q.length < 32 ? [...q, m] : q));
    },
    preview,
    options: premoveOptions(preview, side, chaos, blocked),
    clear: () => {
      setQueue([]);
      setSent(null);
    },
  };
}
