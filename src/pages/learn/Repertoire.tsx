import { groupByOpening, openingFamily, repertoireFamilyLookup } from "../../lib/openingFamilies";
import { exportRepertoire, repertoirePaths, uci } from "../../lib/repertoire";
import { RepertoireInbox, ShareWithFriend } from "./RepertoireFriends";
import RepertoireEditor, { RepertoireImport } from "./RepertoireEditor";
import { usePremoves } from "../../lib/usePremoves";
import PremoveQueue from "../../components/PremoveQueue";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  Plus,
  Trash2,
  GraduationCap,
  RotateCcw,
  Lightbulb,
  Download,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Pencil,
  Share2,
} from "lucide-react";
import { useApp } from "../../lib/context";
import { download, initialFen, uid, useData } from "../../lib/store";
import type { Library, Opening, Repertoire as Line } from "../../lib/types";
import { Board } from "../../components/Board";
import {
  Card,
  ChoiceSelect,
  Button,
  Empty,
  Field,
  IconButton,
  Modal,
} from "../../components/UI";
function positionKey(fen: string) {
  return fen.split(" ", 4).join(" ");
}
export default function Repertoire() {
  const { library, detail, navigate } = useApp();
  const [training, setTraining] = useState<Line | null>(null);
  const [trainingPlan, setTrainingPlan] = useState<Line[] | null>(null);
  const route = detail.slice("repertoire".length + 1);
  const back = () => navigate("learn", "repertoire");
  if (route === "new" || route.startsWith("new/")) {
    return <RepertoireEditor category={route.startsWith("new/") ? route.slice(4) : undefined} onBack={back} />;
  }
  if (route === "import") return <RepertoireImport onBack={back} />;
  if (route.startsWith("shared/")) return <RepertoireImport onBack={back} sharedPgn={route.slice(7)} />;
  if (route.startsWith("edit/")) {
    const line = library.repertoire.find(line => line.id === route.slice(5));
    return line ? <RepertoireEditor line={line} onBack={back} /> :
      <Card><p>That repertoire line is unavailable.</p><Button onClick={back}>Back to repertoire</Button></Card>;
  }
  const add = () => navigate("learn", "repertoire:new");
  if (trainingPlan) return <RepertoireTrainingSession lines={trainingPlan} onClose={() => setTrainingPlan(null)} />;
  if (training)
    return (
      <RepertoireTrainer line={training} onClose={() => setTraining(null)} />
    );
  return <RepertoireLines onTrain={setTraining} onTrainAll={setTrainingPlan} onAdd={add} />;
}

function RepertoireLines({ onTrain, onTrainAll, onAdd }: {
  onTrain: (line: Line) => void;
  onTrainAll: (lines: Line[]) => void;
  onAdd: () => void;
}) {
  const { library, setLibrary, navigate, notify } = useApp();
  const { data: openings } = useData<Opening[]>("openings");
  const categories = library.repertoireCategories;
  const [managing, setManaging] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const defaultGroups = useMemo(() => {
    const groups = groupByOpening(library.repertoire, repertoireFamilyLookup(openings ?? []));
    const existing = new Set(groups.map(group => group.family));
    for (const family of categories?.added ?? []) {
      if (!existing.has(family)) groups.push({ family, lines: [] });
    }
    return groups.sort((a, b) => (a.family === "Other lines" ? 1 : 0) - (b.family === "Other lines" ? 1 : 0) || a.family.localeCompare(b.family));
  }, [library.repertoire, openings, categories?.added]);
  const positions = new Map(categories?.order?.map((family, index) => [family, index]));
  const unranked = positions.size;
  const groups = [...defaultGroups].sort((a, b) =>
    (positions.get(a.family) ?? unranked) - (positions.get(b.family) ?? unranked));
  const trainingLines = groups.flatMap(group => group.lines.filter(line => line.moves.length)
    .sort((a, b) => a.name.localeCompare(b.name)));
  const categoryName = (family: string) => categories?.names?.[family] || family;
  const updateCategories = (update: (current: NonNullable<Library["repertoireCategories"]>) => NonNullable<Library["repertoireCategories"]>) =>
    setLibrary(current => ({ ...current, repertoireCategories: update(current.repertoireCategories ?? {}) }));
  const { data: lessons, error: lessonsError } = useData<Opening[]>("lessons");
  const [query, setQuery] = useState("");
  const [color, setColor] = useState("all");
  const term = query.trim().toLowerCase();
  const reference = useMemo(() => new Map(groupByOpening(
    (lessons ?? []).filter(line => !line.continuation),
    line => openingFamily(line.name),
  ).map(({family, lines}) => [family, lines])), [lessons]);
  const matchesColor = (line: Line) => color === "all" || line.side === color;
  const visible = groups.map(group => ({
    ...group,
    empty: !group.lines.length,
    lines: group.lines.filter(line =>
      matchesColor(line) &&
      (!term || `${categoryName(group.family)} ${group.family} ${line.name}`.toLowerCase().includes(term)))
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter(group => group.lines.length || (
    group.empty &&
    (!term || `${categoryName(group.family)} ${group.family}`.toLowerCase().includes(term))
  ));
  return (
    <div className="repertoire-page">
      <div className="repertoire-controls">
        <div className="section-toolbar repertoire-toolbar">
          <h2 className="repertoire-heading">Your repertoire <span>{library.repertoire.length} {library.repertoire.length === 1 ? "line" : "lines"}</span></h2>
          <div className="button-row">
            <Button className="secondary" aria-haspopup="dialog" onClick={() => setShowSuggestions(true)}>Show suggestions</Button>
            {library.repertoire.some(line => line.moves.length > 0) && <Button className="secondary" onClick={() => setSharing(true)}>
              <Share2 size={16} /> Share
            </Button>}
            {(groups.length > 0 || managing) && <Button className="secondary" onClick={() => setManaging(!managing)}>
              {managing ? "Done" : "Manage categories"}
            </Button>}
            <Button className="secondary" onClick={() => navigate("learn", "repertoire:import")}>
              <Download size={16} /> Import
            </Button>
            {!!trainingLines.length && <Button onClick={() => onTrainAll(trainingLines)}>
              <GraduationCap size={16} /> Train everything
            </Button>}
            <Button className={trainingLines.length ? "secondary" : ""} onClick={onAdd}><Plus size={16} /> Add line</Button>
          </div>
        </div>
        {!managing && !!groups.length && <div className="repertoire-browse">
          <div className="repertoire-color-toggle">
            <ChoiceSelect aria-label="Repertoire color" value={color} onChange={event => setColor(event.target.value)}>
              <option value="all">Both</option><option value="w">White</option><option value="b">Black</option>
            </ChoiceSelect>
          </div>
          <input aria-label="Search repertoire" type="search" placeholder="Search openings or lines" value={query}
            onChange={event => setQuery(event.target.value)} />
        </div>}
      </div>
      <RepertoireInbox />
      {sharing && <RepertoireShare groups={groups.map(({ family, lines }) => ({
        name: categoryName(family), family, lines: lines.filter(line => line.moves.length > 0),
      })).filter(group => group.lines.length)} onClose={() => setSharing(false)} />}
      {showSuggestions && <RepertoireSuggestions
        reference={reference}
        repertoire={library.repertoire}
        savedFamilies={new Set(groups.map(group => group.family))}
        categoryName={categoryName}
        loading={!lessons && !lessonsError}
        error={lessonsError}
        initialSide={color === "b" ? "b" : "w"}
        onClose={() => setShowSuggestions(false)}
        onAdd={(families, lines, side) => {
          const placeholders = lines.map(({ family, lesson }): Line => ({
            id: uid(), name: lesson.name, category: family, suggestionId: lesson.id,
            initial: initialFen, side, moves: [],
          }));
          setLibrary(current => ({
            ...current,
            repertoire: [...current.repertoire, ...placeholders.filter(line =>
              !current.repertoire.some(saved => saved.side === line.side && saved.suggestionId === line.suggestionId))],
            repertoireCategories: {
              ...current.repertoireCategories,
              added: [...new Set([...(current.repertoireCategories?.added ?? []), ...families])],
            },
          }));
          setShowSuggestions(false);
          notify("Added to your repertoire.");
        }}
      />}
      {managing ? (
        <CategoryManager
          families={groups.map(group => group.family)}
          emptyFamilies={new Set(groups.filter(group => !group.lines.length).map(group => group.family))}
          onRemove={family => updateCategories(current => ({
            ...current, added: current.added?.filter(item => item !== family),
          }))}
          categoryName={categoryName}
          onReorder={order => updateCategories(current => ({
            ...current,
            order: [...order, ...(current.order ?? []).filter(family => !order.includes(family))],
          }))}
          onRename={(family, name) => updateCategories(current => ({
            ...current, names: { ...current.names, [family]: name },
          }))}
        />
      ) : <>
      {!groups.length ? (
        <Card>
          <Empty
            icon={<GraduationCap size={35} />}
            title="No saved lines"
            description="Build a line and train either color."
          >
            <Button onClick={onAdd}>Build repertoire</Button>
          </Empty>
        </Card>
      ) : visible.length ? (
        <div className="repertoire-families">
          {visible.map(({ family, lines }) => (
            <section key={family} className="opening-family" aria-label={categoryName(family)}>
              <details open>
                <summary className="repertoire-family-heading">
                  <span className="repertoire-family-title">
                    <span className="repertoire-family-name">{categoryName(family)}</span>
                    <small>{lines.length ? `${lines.length} ${lines.length === 1 ? "line" : "lines"}` : "Empty"}</small>
                  </span>
                  <span className="repertoire-section-action" aria-hidden="true"><span>Show lines</span><span>Hide lines</span></span>
                </summary>
                <div className="repertoire-grid">
                  {!lines.length && <div className="button-row repertoire-empty-category">
                    <Button className="secondary" onClick={() => navigate("learn", "repertoire:new/" + family)}>
                      <Plus size={16} /> Add line to {categoryName(family)}
                    </Button>
                  </div>}
                  {lines.map((line) => (
                    <Card key={line.id} className="repertoire-line">
                      <div className="repertoire-line-info">
                        <h3>{line.name}</h3>
                        <div className="repertoire-line-meta">
                          <span className="repertoire-line-color" data-color={line.side}>
                            {line.side === "w" ? "White" : "Black"}
                          </span>
                          <span>{line.moves.length ? `${Math.ceil(line.moves.length / 2)} moves` : "Empty"}</span>
                        </div>
                      </div>
                      <div className="button-row">
                        {line.moves.length > 0 && <Button onClick={() => onTrain(line)}>
                          <GraduationCap size={15} />
                          Train
                        </Button>}
                        <Button className="secondary" onClick={() => navigate("learn", "repertoire:edit/" + line.id)}>
                          Edit
                        </Button>
                        {line.moves.length > 0 && <IconButton
                          label={`Export ${line.name}`}
                          onClick={() => download("repertoire.pgn", exportRepertoire(line), "application/x-chess-pgn")}
                        >
                          <Download size={16} />
                        </IconButton>}
                        <IconButton
                          label={`Delete ${line.name}`}
                          onClick={() => {
                            setLibrary((l) => ({
                              ...l,
                              repertoire: l.repertoire.filter((v) => v.id !== line.id),
                            }));
                            notify("Line deleted.");
                          }}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </Card>
                  ))}
                </div>
              </details>
            </section>
          ))}
        </div>
      ) : <p className="muted">No repertoire lines match these filters.</p>}
      </>}
    </div>
  );
}

function CategoryManager({ families, emptyFamilies, categoryName, onRemove, onReorder, onRename }: {
  families: string[];
  emptyFamilies: Set<string>;
  onRemove: (family: string) => void;
  categoryName: (family: string) => string;
  onReorder: (order: string[]) => void;
  onRename: (family: string, name: string) => void;
}) {
  const [dragged, setDragged] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [announcement, setAnnouncement] = useState("");

  function move(family: string, index: number) {
    const next = families.filter(item => item !== family);
    next.splice(index, 0, family);
    onReorder(next);
    setAnnouncement(`${categoryName(family)} moved to position ${index + 1} of ${families.length}.`);
  }

  function clearDrag() {
    setDragged(null);
    setTarget(null);
  }

  return <section className="repertoire-category-manager" aria-label="Manage opening categories">
    <p className="caption">Drag the grip or use the arrow buttons to reorder categories.</p>
    <ul>
      {families.map((family, index) => {
        const name = categoryName(family);
        return <li key={family} data-drop-target={target === family}
          onDragOver={event => {
            if (dragged === null) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setTarget(family === dragged ? null : family);
          }}
          onDrop={event => {
            if (dragged === null) return;
            event.preventDefault();
            if (dragged !== family) move(dragged, index);
            clearDrag();
          }}>
          <span className="repertoire-category-grip" draggable aria-hidden="true"
            onDragStart={event => {
              event.dataTransfer.setData("text/plain", family);
              event.dataTransfer.effectAllowed = "move";
              setDragged(family);
            }}
            onDragEnd={clearDrag}><GripVertical size={20} /></span>
          {editing === family ? (
            <form onSubmit={event => {
              event.preventDefault();
              const name = draft.trim();
              if (!name) return;
              onRename(family, name);
              setEditing(null);
              setAnnouncement(`Category renamed to ${name}.`);
            }}>
              <input aria-label="Category name" value={draft} onChange={event => setDraft(event.target.value)}
                autoFocus required maxLength={80} onKeyDown={event => {
                  if (event.key === "Escape") setEditing(null);
                }} />
              <Button type="submit" disabled={!draft.trim()}>Save</Button>
              <Button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            </form>
          ) : (
            <>
              <span className="repertoire-category-name">{name}</span>
              <div className="button-row">
                <IconButton label={`Rename ${name}`} onClick={() => {
                  setDraft(name);
                  setEditing(family);
                }}><Pencil size={16} /></IconButton>
                <IconButton label={`Move ${name} up`} disabled={index === 0}
                  onClick={() => move(family, index - 1)}><ArrowUp size={16} /></IconButton>
                <IconButton label={`Move ${name} down`} disabled={index === families.length - 1}
                  onClick={() => move(family, index + 1)}><ArrowDown size={16} /></IconButton>
                {emptyFamilies.has(family) && <IconButton label={`Remove empty category ${name}`}
                  onClick={() => onRemove(family)}><Trash2 size={16} /></IconButton>}
              </div>
            </>
          )}
        </li>;
      })}
    </ul>
    <span className="sr-only" role="status">{announcement}</span>
  </section>;
}

function RepertoireShare({ groups, onClose }: {
  groups: { family: string; name: string; lines: Line[] }[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const lines = groups.flatMap(group => group.lines).filter(line => selected.includes(line.id));

  const pgn = lines.map(exportRepertoire).join("\n");

  function toggle(ids: string[], checked: boolean) {
    setSelected(current => checked ? [...new Set([...current, ...ids])] : current.filter(id => !ids.includes(id)));
    setLink("");
    setMessage("");
  }

  async function share() {
    const url = new URL(window.location.href);
    url.hash = "learn/repertoire:shared/" + encodeURIComponent(pgn);
    if (url.href.length > 8000) {
      setMessage("This selection is too large for a link. Download the PGN to send it, or select fewer lines.");
      return;
    }
    setLink(url.href);
    try {
      await navigator.clipboard.writeText(url.href);
      setMessage("Link copied.");
    } catch {
      setMessage("Select and copy the link below.");
    }
  }

  return <Modal title="Share repertoire" onClose={onClose}>
    <p className="caption">Choose the lines or opening categories you want to share.</p>
    <div className="repertoire-share-selection">
      {groups.map(group => <fieldset key={group.family}>
        <legend>{group.name}</legend>
        <label className="repertoire-share-all">
          <input type="checkbox" aria-label={`Select all lines in ${group.name}`}
            checked={group.lines.every(line => selected.includes(line.id))}
            onChange={event => toggle(group.lines.map(line => line.id), event.target.checked)} />
          Select all lines
        </label>
        {group.lines.map(line => <label key={line.id}>
          <input type="checkbox" checked={selected.includes(line.id)}
            onChange={event => toggle([line.id], event.target.checked)} />
          {line.name}
        </label>)}
      </fieldset>)}
    </div>
    <ShareWithFriend pgn={pgn} onSent={onClose} />
    <div className="button-row repertoire-share-export">
      <Button className="secondary" disabled={!lines.length} onClick={() => void share()}>Copy link</Button>
      <Button className="secondary" disabled={!lines.length}
        onClick={() => download("repertoire.pgn", pgn, "application/x-chess-pgn")}>Download PGN</Button>
    </div>
    {message && <p role="status" className="caption">{message}</p>}
    {link && <Field label="Share link"><input readOnly value={link} onFocus={event => event.target.select()} /></Field>}
  </Modal>;
}

function RepertoireSuggestions({ reference, repertoire, savedFamilies, categoryName,
  loading, error, initialSide, onClose, onAdd }: {
  reference: Map<string, Opening[]>;
  repertoire: Line[];
  savedFamilies: Set<string>;
  categoryName: (family: string) => string;
  loading: boolean;
  error: string;
  initialSide: Line["side"];
  onClose: () => void;
  onAdd: (families: string[], lines: { family: string; lesson: Opening }[], side: Line["side"]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [side, setSide] = useState(initialSide);
  const sideLines = repertoire.filter(line => line.side === side);
  const savedSuggestions = new Set(sideLines.map(line => line.suggestionId));
  const start = initialFen.split(" ").slice(0, 4).join(" ");
  const paths = sideLines.filter(line => line.initial.split(" ").slice(0, 4).join(" ") === start)
    .flatMap(repertoirePaths);
  const families = [...reference].sort(([a], [b]) => a.localeCompare(b));
  const missingCategories = families.filter(([family]) => !savedFamilies.has(family));
  const missingLines = families.map(([family, lessons]) => [family, lessons.filter(lesson =>
    !savedSuggestions.has(lesson.id) &&
    !paths.some(path => lesson.moves.every((move, index) => path[index] === move)))] as const)
    .filter(([, lessons]) => lessons.length);
  const check = (id: string, label: string) => <label key={id}>
    <input type="checkbox" checked={selected.includes(id)} onChange={event => {
      const checked = event.target.checked;
      setSelected(current => checked ? [...current, id] : current.filter(item => item !== id));
    }} />
    {label}
  </label>;
  const categoriesToAdd = missingCategories.filter(([family]) => selected.includes("category:" + family)).map(([family]) => family);
  const linesToAdd = missingLines.flatMap(([family, lessons]) =>
    lessons.filter(lesson => selected.includes("line:" + lesson.id)).map(lesson => ({ family, lesson })));
  const count = categoriesToAdd.length + linesToAdd.length;

  return <Modal title="Repertoire suggestions" onClose={onClose} wide>
    {error ? <p>Opening suggestions could not be loaded.</p> : loading ? <p>Loading suggestions…</p> : <>
      <p className="caption">Select categories and lines to add as empty placeholders.</p>
      <ChoiceSelect aria-label="Color for new lines" value={side}
        onChange={event => setSide(event.target.value === "b" ? "b" : "w")}>
        <option value="w">White</option><option value="b">Black</option>
      </ChoiceSelect>
      <div className="repertoire-suggestions">
        <section>
          <h3>Missing opening categories</h3>
          {missingCategories.length ? missingCategories.map(([family]) => check("category:" + family, categoryName(family)))
            : <p className="caption">No missing opening categories.</p>}
        </section>
        <section>
          <h3>Suggested missing lines</h3>
          {missingLines.length ? missingLines.map(([family, lessons]) => <details key={family}>
            <summary><span>{categoryName(family)} ({lessons.length})</span>
              <span className="repertoire-section-action" aria-hidden="true"><span>Show</span><span>Hide</span></span>
            </summary>
            {lessons.map(lesson => check("line:" + lesson.id, lesson.name))}
          </details>) : <p className="caption">No missing lesson lines.</p>}
        </section>
      </div>
      <div className="button-row">
        <Button disabled={!count} onClick={() => onAdd(categoriesToAdd, linesToAdd, side)}>
          Add selected{count ? ` (${count})` : ""}
        </Button>
      </div>
    </>}
  </Modal>;
}

type ContinuationIndex = Map<string, { line: Line; index: number; move: string }[]>;

function indexContinuations(lines: Line[], side?: Line["side"]): ContinuationIndex {
  const positions: ContinuationIndex = new Map();
  for (const saved of lines) {
    if ((side && saved.side !== side) || !saved.moves.length) continue;
    for (const moves of repertoirePaths(saved)) {
      const branch = { ...saved, moves };
      const board = new Chess(saved.initial);
      for (const [index, move] of moves.entries()) {
        const position = saved.side + positionKey(board.fen());
        const choices = positions.get(position) ?? [];
        if (!choices.length) positions.set(position, choices);
        choices.push({ line: branch, index, move });
        board.move(move);
      }
    }
  }
  return positions;
}

function RepertoireTrainingSession({ lines, onClose }: { lines: Line[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const continuations = useMemo(() => indexContinuations(lines), [lines]);
  const final = index === lines.length - 1;
  return <RepertoireTrainer key={lines[index].id} line={lines[index]} onClose={onClose}
    session={{
      continuations,
      progress: `Line ${index + 1} of ${lines.length}`,
      nextLabel: final ? "Finish training" : "Next line",
      advance: final ? onClose : () => setIndex(current => current + 1),
    }} />;
}

export function RepertoireTrainer({
  line,
  onClose,
  lines,
  session,
}: {
  line: Line;
  onClose: () => void;
  lines?: Line[];
  session?: { continuations: ContinuationIndex; progress: string; nextLabel: string; advance: () => void };
}) {
  const { library, appearance } = useApp();
  const [fen, setFen] = useState(line.initial),
    [active, setActive] = useState(line),
    [cursor, setCursor] = useState(0),
    [assisted, setAssisted] = useState(false),
    [done, setDone] = useState(false),
    [message, setMessage] = useState(""),
    [hint, setHint] = useState(""),
    [restartCount, setRestartCount] = useState(0);
  const layoutRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const yourTurn = fen.split(" ")[1] === line.side;
  const legalMoves = useMemo(
    () => yourTurn && !done ? new Chess(fen).moves({ verbose: true }).map(uci) : [],
    [fen, yourTurn, done],
  );
  const continuations = useMemo(
    () => session?.continuations ?? indexContinuations(lines ?? library.repertoire, line.side),
    [session?.continuations, lines, library.repertoire, line.side],
  );
  const positionChoices = continuations.get(line.side + positionKey(fen)) ?? [];
  const choices = session ? positionChoices.filter(choice => choice.line.id === line.id) : positionChoices;

  useLayoutEffect(() => {
    const layout = layoutRef.current;
    const panel = panelRef.current;
    const workspace = layout?.closest(".workspace");
    const frame = layout?.querySelector(".board-frame");
    if (!layout || !panel || !workspace || !frame) return;
    const measure = () => {
      const top = layout.getBoundingClientRect().top + window.scrollY;
      const bottom = parseFloat(getComputedStyle(workspace).paddingBottom);
      const stacked = window.matchMedia("(max-width: 760px)").matches;
      const panelSpace = stacked ? panel.offsetHeight + 10 : 0;
      const frameStyle = getComputedStyle(frame);
      const materialSpace = parseFloat(frameStyle.paddingTop) + parseFloat(frameStyle.paddingBottom);
      const budget = Math.max(80, Math.floor(window.innerHeight - top - bottom - panelSpace - materialSpace));
      const limit = `${budget}px`;
      if (layout.style.getPropertyValue("--training-board-limit") !== limit) {
        layout.style.setProperty("--training-board-limit", limit);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    observer.observe(workspace);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  function finish(helped: boolean) {
    if (done) return;
    setDone(true);
    setMessage(helped ? "Line completed with help." : "Line completed.");
  }
  function apply(move: string, l = active, index = cursor) {
    const b = new Chess(fen);
    b.move(move);
    setFen(b.fen());
    setCursor(index + 1);
    setHint("");
    if (index + 1 >= l.moves.length) finish(assisted);
  }
  useEffect(() => {
    if (done || yourTurn) return;
    const move = active.moves[cursor];
    if (!move) {
      finish(assisted);
      return;
    }
    const t = setTimeout(() => apply(move), 120);
    return () => clearTimeout(t);
  }, [fen, done]);
  function attempt(move: string) {
    const match =
      choices.find((choice) => choice.move === move && choice.line.moves === active.moves) ||
      choices.find((choice) => choice.move === move);
    if (!match) {
      setAssisted(true);
      setMessage("Not a saved continuation. Try again.");
      return;
    }
    setActive(match.line);
    setMessage("Correct.");
    apply(move, match.line, match.index);
  }
  const premove = usePremoves({
    fen,
    side: line.side,
    legal: legalMoves,
    active: !done,
    identity: `${line.id}-${restartCount}`,
    execute: attempt,
  });
  function restart() {
    setRestartCount(count => count + 1);
    setFen(line.initial);
    setActive(line);
    setCursor(0);
    setAssisted(false);
    setDone(false);
    setMessage("");
    setHint("");
  }
  return (
    <div className="chess-layout repertoire-training" ref={layoutRef}>
      <div className="board-column">
        <Board
          fen={premove.preview}
          materialFen={fen}
          onCancelPremoves={premove.cancelOnRightClick}
          disabled={done || (!yourTurn && !appearance.premoves)}
          legalMoves={yourTurn ? legalMoves : premove.options}
          flipped={line.side === "b"}
          hint={hint}
          onMove={(from, to, promotion) =>
            yourTurn
              ? attempt(from + to + (promotion || ""))
              : premove.enqueue(from + to + (promotion || ""))
          }
        />
      </div>
      <div className="repertoire-training-panel" ref={panelRef}>
        <Card>
          <div className="repertoire-training-heading">
            <h2>{active.name}</h2>
            <p className="caption">
              {line.side === "w" ? "White" : "Black"} · {Math.ceil(cursor / 2)} /{" "}
              {Math.ceil(active.moves.length / 2)} moves{session && ` · ${session.progress}`}
            </p>
          </div>
          <p className="feedback" role="status">
            {message || (yourTurn ? "Play your next move." : "Playing reply…")}
          </p>
          <div className="button-row">
            {session && done ? <Button onClick={session.advance}>{session.nextLabel}</Button> : <Button
              disabled={done || !yourTurn}
              onClick={() => {
                const expected =
                  choices.find((choice) => choice.line.moves === active.moves) || choices[0];
                if (!expected) return;
                const move = new Chess(fen).move(expected.move);
                setHint(move.from);
                setMessage(`Try ${move.san}.`);
                setAssisted(true);
              }}
            >
              <Lightbulb size={16} />
              Hint
            </Button>}
            <Button className="secondary" onClick={restart}>
              <RotateCcw size={16} />
              Restart
            </Button>
            <Button className="secondary" onClick={onClose}>
              <ArrowLeft size={15} />
              Lines
            </Button>
          </div>
          {appearance.premoves && <div className="repertoire-training-queue">
            <PremoveQueue
              moves={premove.queue}
              undo={() => premove.setQueue((queue) => queue.slice(0, -1))}
              clear={premove.clear}
            />
          </div>}
        </Card>
      </div>
    </div>
  );
}
