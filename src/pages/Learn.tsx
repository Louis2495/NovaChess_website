import {
  BookOpen,
  GraduationCap,
  Library,
  Search,
  Target,
  Lightbulb,
  History,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { useApp } from "../lib/context";
import { PageTitle, Card, Button } from "../components/UI";
import Openings from "./learn/Openings";
import Repertoire from "./learn/Repertoire";
import Research from "./learn/Research";
import Endgames from "./learn/Endgames";
import Knowledge from "./learn/Knowledge";
export default function Learn() {
  const { detail, navigate, library } = useApp();
  const section = detail.split(":")[0];
  const labels: Record<string, string> = {
    repertoire: "Your repertoire",
    train: "Train an opening",
    lessons: "Opening lessons",
    search: "Opening library",
    research: "Research",
    endgames: "Endgames",
    facts: "Fun facts",
    history: "History",
  };
  if (detail)
    return (
      <>
        <PageTitle title={labels[section] || "Learn"}>
          <Button className="secondary" onClick={() => navigate("learn")}>
            <ArrowLeft size={15} />
            Learn
          </Button>
        </PageTitle>
        {section === "repertoire" ? (
          <Repertoire />
        ) : section === "research" ? (
          <Research />
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
  return (
    <>
      <PageTitle
        title="Learn"
        subtitle="Repertoire, openings and chess knowledge"
      />
      <div className="learn-hub">
        {[
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
            text: "111 curated lessons",
            icon: BookOpen,
            color: "blue",
          },
          {
            id: "research",
            title: "Research",
            text: "Explore public games",
            icon: Search,
            color: "orange",
          },
          {
            id: "endgames",
            title: "Endgames",
            text: "17 positions · engine replies",
            icon: Target,
            color: "blue",
          },
          {
            id: "facts",
            title: "Fun facts",
            text: "56 sourced cards",
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
        ].map(({ id, title, text, icon: Icon, color }) => (
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
      <Card className="learn-summary">
        <BookOpen size={22} />
        <div>
          <h3>Local progress</h3>
          <p>
            {library.progress.learned.length} lessons completed ·{" "}
            {library.progress.endgames.length} endgames completed ·{" "}
            {library.repertoire.filter((r) => r.due < Date.now()).length}{" "}
            repertoire lines due
          </p>
        </div>
      </Card>
    </>
  );
}
