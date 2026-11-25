import { resolvePlayColor } from "../../lib/playColor";
import { Fragment, useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Download, RotateCcw, Save, SkipBack, Trash2 } from "lucide-react";
import { Chess } from "chess.js";
import { Board } from "../../components/Board";
import { Button, Card, ChoiceSelect, Field } from "../../components/UI";
import { useApp } from "../../lib/context";
import { lichessStudyExport, parseRepertoireStudy, repertoirePaths, repertoireTree, uci, type RepertoireMove } from "../../lib/repertoire";
import { initialFen, uid } from "../../lib/store";
import type { Repertoire } from "../../lib/types";

function startsWith(path: string[], prefix: string[]) {
  return prefix.length <= path.length && prefix.every((move, index) => path[index] === move);
}

function Notation({ nodes, prefix, cursor, select, label }: {
  nodes: RepertoireMove[]; prefix: string[]; cursor: string[];
  select: (moves: string[]) => void; label: string;
}) {
  const rows: { number: number; white?: { node: RepertoireMove; path: string[] }; black?: { node: RepertoireMove; path: string[] };
    sidelines: { node: RepertoireMove; prefix: string[] }[] }[] = [];
  for (let moves = nodes, path = prefix; moves.length;) {
    const [node, ...alternatives] = moves;
    let row = rows.at(-1);
    if (!row || row.number !== node.number) {
      row = { number: node.number, sidelines: [] };
      rows.push(row);
    }
    row.sidelines.push(...alternatives.map(node => ({ node, prefix: path })));
    path = [...path, uci(node.move)];
    row[node.move.color === "w" ? "white" : "black"] = { node, path };
    moves = node.children;
  }
  const moveButton = (cell?: { node: RepertoireMove; path: string[] }) => cell &&
    <button type="button" aria-current={cursor.length === cell.path.length && startsWith(cursor, cell.path) ? "step" : undefined}
      onClick={() => select(cell.path)}>{cell.node.move.san}</button>;
  return <table className="repertoire-notation" aria-label={label}>
    <caption>{prefix.length === 0 && label === "Main line" ? label : "Sideline"}</caption>
    <thead><tr><th scope="col" aria-label="Move number">#</th><th scope="col">White</th><th scope="col">Black</th></tr></thead>
    <tbody>{rows.map(row => <Fragment key={row.number}>
      <tr><th scope="row">{row.number}.</th><td>{moveButton(row.white)}</td><td>{moveButton(row.black)}</td></tr>
      {row.sidelines.map(({ node, prefix }) => <tr className="repertoire-sideline" key={[...prefix, uci(node.move)].join(" ")}>
        <td colSpan={3}><Notation nodes={[node]} prefix={prefix} cursor={cursor} select={select}
          label={`Sideline ${node.number}${node.move.color === "w" ? "." : "..."} ${node.move.san}`} /></td>
      </tr>)}
    </Fragment>)}</tbody>
  </table>;
}

export default function RepertoireEditor({ line, category, onBack }: { line?: Repertoire; category?: string; onBack: () => void }) {
  const { setLibrary, notify } = useApp();
  const initial = line?.initial ?? initialFen;
  const [name, setName] = useState(line?.name ?? "");
  const [side, setSide] = useState(line?.side ?? "w");
  const [paths, setPaths] = useState(() => line ? repertoirePaths(line) : [[]]);
  const [cursor, setCursor] = useState<string[]>(() => line?.moves ?? []);
  const [undo, setUndo] = useState<{ paths: string[][]; cursor: string[] }[]>([]);
  const tree = useMemo(() => repertoireTree(initial, paths), [initial, paths]);
  const board = new Chess(initial);
  cursor.forEach(move => board.move(move));
  const next = paths.find(path => path.length > cursor.length && startsWith(path, cursor))?.[cursor.length];
  function play(from: string, to: string, promotion?: string) {
    let move;
    try { move = uci(new Chess(board.fen()).move({ from, to, promotion })); }
    catch { return; }
    const position = [...cursor, move];
    if (!paths.some(path => startsWith(path, position))) {
      setUndo(history => [...history, { paths, cursor }]);
      const end = paths.findIndex(path => path.length === cursor.length && startsWith(path, cursor));
      setPaths(end < 0 ? [...paths, position] : paths.map((path, index) => index === end ? position : path));
    }
    setCursor(position);
  }
  function removeMove() {
    if (!cursor.length) return;
    const parent = cursor.slice(0, -1);
    const trimmed = paths.map(path => startsWith(path, cursor) ? parent : path);
    const unique = trimmed.filter((path, index) => !trimmed.some((other, otherIndex) =>
      startsWith(other, path) && (other.length > path.length || otherIndex < index)));
    setUndo(history => [...history, { paths, cursor }]);
    setPaths(unique);
    setCursor(parent);
  }
  function save() {
    const [moves, ...branches] = paths;
    if (!name.trim() || !moves.length) return;
    const updated: Repertoire = {
      id: line?.id ?? uid(), category: line?.category ?? category, suggestionId: line?.suggestionId, name: name.trim(), side, initial, moves, branches,
    };
    setLibrary(library => ({
      ...library,
      repertoire: line ? library.repertoire.map(item => item.id === line.id ? updated : item) : [...library.repertoire, updated],
    }));
    notify("Repertoire saved.");
    onBack();
  }
  return <section className="repertoire-editor">
    <h1>{line ? "Edit repertoire line" : "Add repertoire line"}</h1>
    <div className="chess-layout repertoire-workspace">
      <div className="board-column">
        <Board fen={board.fen()} flipped={side === "b"} onMove={play} />
        <div className="button-row repertoire-navigation">
          <Button className="secondary" disabled={!cursor.length} onClick={() => setCursor([])}><SkipBack size={16} /> Start position</Button>
          <Button className="secondary" aria-label="Previous move" disabled={!cursor.length} onClick={() => setCursor(cursor.slice(0, -1))}><ChevronLeft size={18} /></Button>
          <Button className="secondary" aria-label="Next move" disabled={!next} onClick={() => next && setCursor([...cursor, next])}><ChevronRight size={18} /></Button>
          <Button className="secondary" disabled={!undo.length} onClick={() => {
            const previous = undo.at(-1);
            if (!previous) return;
            setPaths(previous.paths);
            setCursor(previous.cursor);
            setUndo(undo.slice(0, -1));
          }}><RotateCcw size={16} /> Undo</Button>
          <Button className="secondary" disabled={!cursor.length} onClick={removeMove}><Trash2 size={16} /> Remove move</Button>
        </div>
      </div>
      <Card className="repertoire-edit-panel">
        <Field label="Line name"><input value={name} onChange={event => setName(event.target.value)} maxLength={100} /></Field>
        <Field label="Train as"><ChoiceSelect value={side} onChange={event => setSide(resolvePlayColor(event.target.value))}>
          <option value="w">White</option><option value="b">Black</option><option value="random">Random</option>
        </ChoiceSelect></Field>
        <p className="caption">Select an earlier move, then play a different continuation to add a sideline.</p>
        <div className="repertoire-moves"><Notation nodes={tree} prefix={[]} cursor={cursor} select={setCursor} label="Main line" /></div>
        <Button disabled={!name.trim() || !paths[0].length} onClick={save}><Save size={16} /> Save line</Button>
      </Card>
    </div>
  </section>;
}

export function RepertoireImport({ onBack, sharedPgn }: { onBack: () => void; sharedPgn?: string }) {
  const { setLibrary, notify } = useApp();
  const [url, setUrl] = useState("");
  const [pgn, setPgn] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [request, setRequest] = useState<AbortController>();
  useEffect(() => () => request?.abort(), [request]);
  const sharedLines = useMemo(() => {
    if (!sharedPgn || sharedPgn.length > 8000) return [];
    try { return parseRepertoireStudy(sharedPgn); }
    catch { return []; }
  }, [sharedPgn]);
  function saveChapters(chapters: ReturnType<typeof parseRepertoireStudy>) {
    const lines = chapters.map(chapter => ({ ...chapter, id: uid() }));
    setLibrary(library => ({ ...library, repertoire: [...library.repertoire, ...lines] }));
    notify(`Imported ${lines.length} ${lines.length === 1 ? "line" : "lines"}.`);
    onBack();
  }
  async function load() {
    setError("");
    let source: string | undefined;
    if (!pgn.trim()) {
      try { source = lichessStudyExport(url); }
      catch { setError("Enter a supported study link or paste the study’s PGN."); return; }
    }
    const controller = new AbortController();
    setRequest(controller);
    setBusy(true);
    try {
      let text = pgn;
      if (source) {
        const response = await fetch(source, { signal: controller.signal }).catch(() => null);
        if (controller.signal.aborted) return;
        if (!response?.ok) throw Error("Could not download this study. Export its PGN and paste it below.");
        text = await response.text();
      }
      let chapters;
      try { chapters = parseRepertoireStudy(text); }
      catch { throw Error("The PGN could not be read. Use the PGN exported from a standard chess study."); }
      if (!chapters.length) throw Error("The study has no chapters with moves.");
      saveChapters(chapters);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  if (sharedPgn !== undefined) return <Card className="repertoire-import">
    <h1>Shared repertoire</h1>
    {sharedLines.length ? <>
      <p className="caption">Add these lines and their sidelines to your repertoire.</p>
      <ul>{sharedLines.map((line, index) => <li key={index}>{line.name} · {line.side === "w" ? "White" : "Black"}</li>)}</ul>
      <Button onClick={() => saveChapters(sharedLines)}><Download size={16} /> Import lines</Button>
    </> : <p role="alert">This repertoire link could not be read.</p>}
  </Card>;

  return <Card className="repertoire-import">
    <h1>Import</h1>
    <p className="caption"><BookOpen size={16} aria-hidden="true" /> Each chapter becomes a repertoire line with its own sidelines.</p>
    <Field label="Study link"><input type="url" value={url} onChange={e => setUrl(e.target.value)} /></Field>
    <Field label="Upload a PGN file"><input type="file" accept=".pgn" onChange={async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try { setPgn(await file.text()); setError(""); }
      catch { setError("Could not read this PGN file."); }
    }} /></Field>
    <Field label="Or paste exported PGN"><textarea value={pgn} onChange={e => setPgn(e.target.value)} rows={6} /></Field>
    {error && <p role="alert" className="error">{error}</p>}
    <Button disabled={busy || !(url.trim() || pgn.trim())} onClick={() => void load()}><Download size={16} /> {busy ? "Importing…" : "Import"}</Button>
  </Card>;
}
