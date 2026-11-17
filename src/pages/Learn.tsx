import {
  BookOpen,
  GraduationCap,
  Library,
  Clapperboard,
  Target,
  Lightbulb,
  History,
  Brain,
  Sparkles,
  BookMarked,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { useApp } from "../lib/context";
import { PageTitle, Button } from "../components/UI";
import OpeningTraps from "./learn/OpeningTraps";
import Openings from "./learn/Openings";
import Repertoire from "./learn/Repertoire";
import FamousGames from "./learn/FamousGames";
import Endgames from "./learn/Endgames";
import Encyclopedia from "./learn/Encyclopedia";
import Playground from "./learn/Playground";
import Knowledge from "./learn/Knowledge";
export default function Learn() {
  const { detail, navigate, library } = useApp();
  const section = detail.split(":")[0];
  const labels: Record<string, string> = {
    repertoire: "Your repertoire",
    train: "Train an opening",
    lessons: "Opening lessons",
    traps: "Opening traps",
    search: "Opening library",
    famous: "Famous games",
    endgames: "Endgame Lessons",
    facts: "Fun facts",
    history: "History",
    encyclopedia: "Encyclopedia",
    trivia: "Trivia",
    quizzes: "Quizzes",
  };
  if (detail)
    return (
      <>
        <div className="learn-page-heading">
          <Button
            className="learn-back"
            aria-label="Back to Learn"
            onClick={() => navigate("learn")}
          >
            <ArrowLeft size={21} />
          </Button>
          <PageTitle title={labels[section] || "Learn"}></PageTitle>
        </div>
        {section === "traps" ? (
          <OpeningTraps />
        ) : section === "encyclopedia" ? (
          <Encyclopedia />
        ) : section === "trivia" ? (
          <Playground trivia />
        ) : section === "quizzes" ? (
          <Playground />
        ) : section === "repertoire" ? (
          <Repertoire />
        ) : section === "famous" ? (
          <FamousGames />
        ) : section === "endgames" ? (
          <Endgames />
        ) : section === "facts" || section === "history" ? (
          <Knowledge section={section} />
        ) : (
          <Openings
            mode={section === "train" ? "train" : "lesson"}
            query={section === "search" ? detail.slice(7) : ""}
            selectedId={section === "lessons" ? detail.slice(8) : undefined}
          />
        )}
      </>
    );
  const tiles = [
          {
            id: "traps",
            title: "Opening traps",
            text: "20 traps · defenses & practice",
            icon: ShieldCheck,
            color: "orange",
          },
          {
            id: "encyclopedia",
            title: "Encyclopedia",
            text: "Motifs, players, events & more",
            icon: BookMarked,
            color: "blue",
          },
          {
            id: "trivia",
            title: "Trivia",
            text: "Test your chess knowledge",
            icon: Brain,
            color: "purple",
          },
          {
            id: "quizzes",
            title: "Quizzes",
            text: "Choose moves, find your style",
            icon: Sparkles,
            color: "orange",
          },
          {
            id: "repertoire",
            title: "Your repertoire",
            text: `${library.repertoire.length} saved lines`,
            icon: Library,
            color: "green",
          },
          {
            id: "train",
            title: "Train an opening",
            text: "Practice the next move",
            icon: GraduationCap,
            color: "purple",
          },
          {
            id: "lessons",
            title: "Opening lessons",
            text: "129 guided lessons",
            icon: BookOpen,
            color: "blue",
          },
          {
            id: "famous",
            title: "Famous games",
            text: "Master games · replay & explore",
            icon: Clapperboard,
            color: "orange",
          },
          {
            id: "endgames",
            title: "Endgame Lessons",
            text: "17 positions · engine replies",
            icon: Target,
            color: "blue",
          },
          {
            id: "facts",
            title: "Fun facts",
            text: "75 selected stories",
            icon: Lightbulb,
            color: "orange",
          },
          {
            id: "history",
            title: "History",
            text: "Milestones, champions & ratings",
            icon: History,
            color: "purple",
          },
        ];
  return (
    <>
      <PageTitle title="Learn" />
      <div className="learn-groups">
        {[
          {title:"Lessons & practice", ids:["lessons","traps","endgames","train","repertoire"]},
          {title:"Explore chess", ids:["famous","encyclopedia","history"]},
          {title:"Just for fun", ids:["quizzes","trivia","facts"]},
        ].map(group => <section className="learn-group" key={group.title}>
          <h2 className="learn-group-title">{group.title}</h2>
          <div className="learn-hub">
          {group.ids.map(id => tiles.find(tile => tile.id === id)!).map(({ id, title, text, icon: Icon, color }) => (
          <button
            className={`card learn-tile ${color}`}
            key={id}
            onClick={() => navigate("learn", id)}
          >
            <span className="learn-tile-icon">
              <Icon size={30} />
            </span>
            <h2>{title}</h2>
            <p>{text}</p>
            <ChevronRight size={19} />
          </button>
        ))}
          </div>
        </section>)}
      </div>
    </>
  );
}
