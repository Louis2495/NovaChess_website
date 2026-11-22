import { useState } from "react";
import { ArrowRight, RotateCcw, Check, ArrowUpRight, Trophy, CheckCircle2 } from "lucide-react";
import { base, useData } from "../../lib/store";
import { useApp } from "../../lib/context";
import { Button, Card, Loading } from "../../components/UI";
function QuizPicture({
  tile,
  result = false,
  sheet = "illustrations.webp",
  label,
}: {
  tile: number;
  result?: boolean;
  sheet?: string;
  label?: string;
}) {
  return (
    <span
      aria-hidden={label?undefined:true}
      role={label?"img":undefined}
      aria-label={label}
      className={`quiz-picture${result ? " quiz-picture-result" : ""}`}
      style={{
        backgroundImage: `url("${base}quizzes/${sheet}")`,
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
function shuffle<T>(a: T[]) {
  return [...a].sort(() => Math.random() - 0.5);
}
export default function Playground() {
 const {data:questions,error}=useData<Question[]>("trivia");
 return questions ? <Trivia questions={questions}/> : <Loading error={error}/>;
}
function Trivia({ questions }: { questions: Question[] }) {
  const { library, setLibrary, navigate } = useApp();
  const [deck, setDeck] = useState(() => shuffle(questions)),
    [round, setRound] = useState(0),
    [choice, setChoice] = useState<string | null>(null),
    [score, setScore] = useState(0),
    [streak, setStreak] = useState(0),
    [answers, setAnswers] = useState(() =>
      shuffle(questions.find((q) => q.id === deck[0].id)!.answers),
    ),
    [done, setDone] = useState(false),
    [review, setReview] = useState<{question:Question; selected:string; correct:boolean}[]>([]),
    [bestStreak, setBestStreak] = useState(0);
  const q = deck[round];
  function pick(a: string) {
    if (choice) return;
    setChoice(a);
    const correct = a === q.answers[q.correct];
    setReview(previous => [...previous, {question:q, selected:a, correct}]);
    if (correct) setBestStreak(previous => Math.max(previous, streak + 1));
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
  const correctCount = review.filter(answer => answer.correct).length;
  return (
    <Card className={done ? "trivia-game quiz-result results-screen" : "trivia-game"}>
      {done ? (
        <>
          <div className="result-banner"><span><CheckCircle2 size={16}/>Round complete</span><span>10 questions answered</span></div>
          <div className="result-hero"><div className="result-art"><QuizPicture tile={7} result/></div><div className="result-introduction"><span className="result-eyebrow"><Trophy size={16}/>Your trivia result</span><h2>{score} points</h2><p>{correctCount===10?"You got every question right.":correctCount>=7?"You got most of the questions right.":correctCount>=4?"See which answers you got right and what you missed.":"Review the answers below before trying another round."}</p><div className="result-seal">Best: {library.progress.triviaBest || 0}</div></div></div>
          <div className="result-metrics"><div><strong>{correctCount}<small> / 10</small></strong><span>Correct answers</span></div><div><strong>{correctCount*10}%</strong><span>Accuracy</span></div><div><strong>{bestStreak}</strong><span>Best streak this round</span></div></div>
          <section className="result-review"><h3>Review your answers</h3>{review.map((answer,index)=><details key={answer.question.id} className={answer.correct?"review-correct":"review-incorrect"}><summary><span className="review-number">{index+1}</span><span>{answer.question.prompt}{answer.question.clue && <small className="review-clue">{answer.question.clue}</small>}</span><span className="review-verdict">{answer.correct?"Correct":"Review"}</span></summary><div className="review-answer">{!answer.correct&&<p>Your answer: {answer.selected}</p>}<p><b>Correct answer:</b> {answer.question.answers[answer.question.correct]}</p><p>{answer.question.explanation}</p><a className="external" href={answer.question.source} target="_blank" rel="noreferrer">Read the source<ArrowUpRight size={14}/></a></div></details>)}</section>
          <div className="result-footer"><div><h3>Ready for another round?</h3></div><div className="result-actions"><Button onClick={() => {
      const next = shuffle(questions); setDeck(next); setRound(0); setScore(0);
      setChoice(null); setStreak(0); setBestStreak(0); setReview([]);
      setAnswers(shuffle(next[0].answers)); setDone(false);
    }}><RotateCcw size={16}/>Play again</Button><Button className="secondary" onClick={()=>navigate("learn")}>Explore Learn<ArrowRight size={16}/></Button></div></div>
        </>
      ) : (
        <>
          <div className="game-score-row">
            <span>Question {(round % 10) + 1} of 10</span>
            <b>{score} points</b>
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
