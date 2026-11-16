import { useState } from "react";
import { ArrowRight, RotateCcw, Check, ArrowUpRight } from "lucide-react";
import { base, useData } from "../../lib/store";
import { useApp } from "../../lib/context";
import { Board } from "../../components/Board";
import { Button, Card, Loading } from "../../components/UI";
function QuizPicture({
  tile,
  result = false,
}: {
  tile: number;
  result?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`quiz-picture${result ? " quiz-picture-result" : ""}`}
      style={{
        backgroundImage: `url("${base}quizzes/illustrations.webp")`,
        backgroundPosition: `${((tile % 4) * 100) / 3}% ${Math.floor(tile / 4) * 100}%`,
      }}
    />
  );
}
type Question = {
  id: string;
  prompt: string;
  clue?: string;
  category: string;
  answers: string[];
  correct: number;
  explanation: string;
  source: string;
};
type Scenario = { prompt: string; fen: string; moves: string[] };
function shuffle<T>(a: T[]) {
  return [...a].sort(() => Math.random() - 0.5);
}
export default function Playground({ trivia = false }: { trivia?: boolean }) {
  const { data: questions, error } = useData<Question[]>("trivia"),
    { data: scenarios } = useData<Scenario[]>("personality");
  if (!questions || !scenarios) return <Loading error={error} />;
  return trivia ? (
    <Trivia questions={questions} />
  ) : (
    <Personality scenarios={scenarios} />
  );
}
function Trivia({ questions }: { questions: Question[] }) {
  const { library, setLibrary } = useApp();
  const [deck, setDeck] = useState(() => shuffle(questions)),
    [round, setRound] = useState(0),
    [choice, setChoice] = useState<string | null>(null),
    [score, setScore] = useState(0),
    [streak, setStreak] = useState(0),
    [answers, setAnswers] = useState(() =>
      shuffle(questions.find((q) => q.id === deck[0].id)!.answers),
    ),
    [done, setDone] = useState(false);
  const q = deck[round];
  function pick(a: string) {
    if (choice) return;
    setChoice(a);
    const correct = a === q.answers[q.correct];
    if (correct) {
      const next = score + 100 + Math.min(50, streak * 10);
      setScore(next);
      setStreak((s) => s + 1);
      setLibrary((l) => ({
        ...l,
        progress: {
          ...l.progress,
          triviaCorrect: (l.progress.triviaCorrect || 0) + 1,
          triviaBest: Math.max(l.progress.triviaBest || 0, next),
        },
      }));
    } else setStreak(0);
  }
  return (
    <Card className="trivia-game">
      {done ? (
        <>
          <QuizPicture tile={7} result />
          <h2>{score} points</h2>
          <p className="caption">Best: {library.progress.triviaBest || 0}</p>
          <Button
            onClick={() => {
              const next = shuffle(questions);
              setDeck(next);
              setRound(0);
              setScore(0);
              setChoice(null);
              setStreak(0);
              setAnswers(shuffle(next[0].answers));
              setDone(false);
            }}
          >
            <RotateCcw size={16} />
            Play again
          </Button>
        </>
      ) : (
        <>
          <div className="game-score-row">
            <span>{(round % 10) + 1} / 10</span>
            <b>{score} pts</b>
          </div>
          <span className="pill">{q.category}</span>
          <div className="trivia-question">
            <h2>{q.prompt}</h2>
            {q.clue && <p className="trivia-clue">{q.clue}</p>}
          </div>
          <div className="trivia-options">
            {answers.map((a) => (
              <button
                key={a}
                disabled={choice !== null}
                className={
                  (choice &&
                    (a === q.answers[q.correct]
                      ? "correct"
                      : a === choice
                        ? "incorrect"
                        : "")) ||
                  ""
                }
                onClick={() => pick(a)}
              >
                {a}
                {choice && a === q.answers[q.correct] && <Check size={18} />}
              </button>
            ))}
          </div>
          {choice && (
            <>
              <p role="status" className="trivia-explanation">
                {q.explanation}
              </p>
              <div className="button-row trivia-next">
                <Button
                  onClick={() => {
                    if (round % 10 === 9) {
                      setDone(true);
                      return;
                    }
                    const next = round + 1;
                    setRound(next);
                    setChoice(null);
                    setAnswers(shuffle(deck[next].answers));
                  }}
                >
                  Next
                  <ArrowRight size={16} />
                </Button>
                <a
                  className="external"
                  href={q.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  Source
                  <ArrowUpRight size={14} />
                </a>
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
}
const quizzes = [
  { id: "style", title: "Your chess style", art: 0 },
  { id: "princess", title: "Which Disney princess?", art: 1 },
  { id: "alter", title: "Your chess alter ego", art: 2 },
];
const results = {
  style: [
    [
      "The attacker",
      "You choose activity and make your opponent solve concrete problems.",
    ],
    [
      "The architect",
      "You prefer central control and plans that improve the whole position.",
    ],
    [
      "The technician",
      "You value development, sound structure and positions you can explain.",
    ],
    [
      "The explorer",
      "You enjoy flexibility and less predictable routes into the middlegame.",
    ],
  ],
  princess: [
    ["Mulan", "Direct, resourceful, and ready to seize the initiative."],
    ["Belle", "Curious about the position before committing to a plan."],
    ["Tiana", "Practical development and steady work toward a clear goal."],
    [
      "Rapunzel",
      "Imaginative routes, new possibilities, and a willingness to explore.",
    ],
  ],
  alter: [
    ["The tactician", "Every position is an invitation to calculate."],
    [
      "The cartographer",
      "You look for squares, structures and a route forward.",
    ],
    [
      "The endgame detective",
      "Small details and useful improvements catch your eye.",
    ],
    [
      "The opening explorer",
      "You would rather investigate a new path than copy the last game.",
    ],
  ],
};
function Personality({ scenarios }: { scenarios: Scenario[] }) {
  const [quiz, setQuiz] = useState<keyof typeof results | null>(null),
    [step, setStep] = useState(0),
    [scores, setScores] = useState([0, 0, 0, 0]);
  if (!quiz)
    return (
      <div className="quiz-selection">
        {quizzes.map((q) => (
          <button
            className="card"
            key={q.id}
            onClick={() => setQuiz(q.id as keyof typeof results)}
          >
            <QuizPicture tile={q.art} />
            <h2>{q.title}</h2>
            <span className="caption">6 chess choices</span>
            <ArrowRight size={20} />
          </button>
        ))}
      </div>
    );
  if (step === scenarios.length) {
    const index = scores.indexOf(Math.max(...scores)),
      [title, text] = results[quiz][index];
    return (
      <Card className="quiz-result">
        <QuizPicture tile={[3, 4, 5, 6][index]} result />
        <span className="pill">For fun</span>
        <h2>{title}</h2>
        <p>{text}</p>
        <Button
          onClick={() => {
            setStep(0);
            setScores([0, 0, 0, 0]);
            setQuiz(null);
          }}
        >
          <RotateCcw size={16} />
          Try another quiz
        </Button>
      </Card>
    );
  }
  const scenario = scenarios[step];
  return (
    <div className="chess-layout">
      <div className="board-column">
        <Board key={scenario.fen} fen={scenario.fen} disabled />
      </div>
      <Card className="personality-question">
        <div className="game-score-row">
          <span>
            {step + 1} / {scenarios.length}
          </span>
          <button
            onClick={() => {
              setQuiz(null);
              setStep(0);
              setScores([0, 0, 0, 0]);
            }}
          >
            Quizzes
          </button>
        </div>
        <h2>{scenario.prompt}</h2>
        <div className="quiz-moves">
          {scenario.moves.map((m, i) => (
            <button
              key={m}
              onClick={() => {
                setScores((s) => s.map((v, j) => v + (i === j ? 1 : 0)));
                setStep((n) => n + 1);
              }}
            >
              {m}
              <ArrowRight size={16} />
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
