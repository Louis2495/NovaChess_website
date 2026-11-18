import {quizArtwork} from "../../lib/quizArtwork";
import { useState } from "react";
import { ArrowRight, RotateCcw, Check, ArrowUpRight, Trophy, Sparkles, CheckCircle2 } from "lucide-react";
import { base, useData } from "../../lib/store";
import { useApp } from "../../lib/context";
import { Board } from "../../components/Board";
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
type FunQuiz = {id:string;title:string;description:string;art:number;results:{title:string;text:string}[];questions:{prompt:string;answers:{label:string;score:number}[]}[]};
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
function QuizOutcome({id, title, text, outcomes, scores, onBack, onRetake}: {
  id:string; title:string; text:string; outcomes:{title:string;text:string}[];
  scores:number[]; onBack:()=>void; onRetake:()=>void;
}) {
  const total = scores.reduce((sum, score) => sum + score, 0);
  const winner = scores.indexOf(Math.max(...scores));
  const tied = scores.filter(score => score === scores[winner]).length > 1;
  return <Card className="quiz-result results-screen">
    <div className="result-banner"><span><CheckCircle2 size={16}/>Quiz complete</span><span>{total} choices explored</span></div>
    <div className="result-hero">
      <div className="result-art"><QuizPicture {...quizArtwork(id,winner)} label={title} result/></div>
      <div className="result-introduction"><span className="result-eyebrow"><Sparkles size={16}/> Your result</span><h2 tabIndex={-1} autoFocus>{title}</h2><p>{text}</p><div className="result-seal">A new side of your chess personality</div></div>
    </div>
    <div className="result-details">
      <section className="result-breakdown"><h3>Your mix</h3><p>Every choice adds to the picture. Here’s how yours came together.</p>
        <div className="result-distribution">{outcomes.map((outcome,index)=><div key={outcome.title} className={index===winner?"result-trait leading":"result-trait"}>
          <div><span>{outcome.title}</span><b>{scores[index]} / {total}</b></div><div className="result-track"><span style={{width:`${total?scores[index]/total*100:0}%`}}/></div>
        </div>)}</div>
        {tied && <p className="result-tie">A close call: your top outcomes tied. The first matching result is shown.</p>}
      </section>
      <section className="result-next"><span className="result-eyebrow">The next move</span><h3>There’s more to discover</h3><p>Try another theme to see a different side of your choices, or retake this quiz and explore a different path.</p><div className="result-actions"><Button onClick={onBack}>Try another quiz<ArrowRight size={18}/></Button><Button className="secondary" onClick={onRetake}><RotateCcw size={16}/>Retake quiz</Button></div></section>
    </div>
  </Card>;
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
          <div className="result-banner"><span><CheckCircle2 size={16}/>Round complete</span><span>10 questions explored</span></div>
          <div className="result-hero"><div className="result-art"><QuizPicture tile={7} result/></div><div className="result-introduction"><span className="result-eyebrow"><Trophy size={16}/>Your trivia result</span><h2>{score} points</h2><p>{correctCount===10?"A perfect round. You know your chess facts inside out.":correctCount>=7?"A strong round. Your chess knowledge is paying off.":correctCount>=4?"A solid foundation, with a few new discoveries along the way.":"Every round is a chance to discover something new. Keep your curiosity in play."}</p><div className="result-seal">Best: {library.progress.triviaBest || 0}</div></div></div>
          <div className="result-metrics"><div><strong>{correctCount}<small> / 10</small></strong><span>Correct answers</span></div><div><strong>{correctCount*10}%</strong><span>Accuracy</span></div><div><strong>{bestStreak}</strong><span>Best streak this round</span></div></div>
          <section className="result-review"><h3>Your round, revisited</h3><p>Take the answers—and the stories behind them—into your next round.</p>{review.map((answer,index)=><details key={answer.question.id} className={answer.correct?"review-correct":"review-incorrect"}><summary><span className="review-number">{index+1}</span><span>{answer.question.prompt}{answer.question.clue && <small className="review-clue">{answer.question.clue}</small>}</span><span className="review-verdict">{answer.correct?"Correct":"Review"}</span></summary><div className="review-answer">{!answer.correct&&<p>Your answer: {answer.selected}</p>}<p><b>Correct answer:</b> {answer.question.answers[answer.question.correct]}</p><p>{answer.question.explanation}</p><a className="external" href={answer.question.source} target="_blank" rel="noreferrer">Read the source<ArrowUpRight size={14}/></a></div></details>)}</section>
          <div className="result-footer"><div><h3>Ready for another round?</h3><p>Ten more questions. A new chance to beat your best.</p></div><div className="result-actions"><Button onClick={() => {
      const next = shuffle(questions); setDeck(next); setRound(0); setScore(0);
      setChoice(null); setStreak(0); setBestStreak(0); setReview([]);
      setAnswers(shuffle(next[0].answers)); setDone(false);
    }}><RotateCcw size={16}/>Play again</Button><Button className="secondary" onClick={()=>navigate("learn")}>Explore Learn<ArrowRight size={16}/></Button></div></div>
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
  { id: "style", title: "What's your chess style?", art: 0 },
  { id: "princess", title: "Which Disney princess are you?", art: 1 },
  { id: "alter", title: "What's your chess alter ego?", art: 2 },
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
function ExtraQuiz({quiz,onBack}:{quiz:FunQuiz;onBack:()=>void}){
 const [answers,setAnswers]=useState<number[]>([]);
 const scores=quiz.results.map((_,i)=>answers.filter(a=>a===i).length);
 const done=answers.length===quiz.questions.length;
 const winner=scores.indexOf(Math.max(...scores));
 const question=quiz.questions[answers.length];
 if(done)return <QuizOutcome id={quiz.id} title={quiz.results[winner].title} text={quiz.results[winner].text} outcomes={quiz.results} scores={scores} onBack={onBack} onRetake={()=>setAnswers([])}/>;
 return <Card className="personality-question fun-quiz">
 <div className="game-score-row"><span>{answers.length+1} / {quiz.questions.length}</span><button onClick={onBack}>Quizzes</button></div>
 <QuizPicture {...quizArtwork(quiz.id)}/>
 <h2>{question.prompt}</h2><div className="quiz-moves">{question.answers.map(a=><button key={a.label} onClick={()=>setAnswers(prev=>[...prev,a.score])}>{a.label}</button>)}</div>{answers.length>0 && <Button className="text-button" onClick={()=>setAnswers(prev=>prev.slice(0,-1))}>Previous</Button>}
 </Card>;
}
function Personality({ scenarios }: { scenarios: Scenario[] }) {
  const {data:extras,error:extraError}=useData<FunQuiz[]>("personality-quizzes");
  const [extra,setExtra]=useState<FunQuiz|null>(null);
  const [quiz, setQuiz] = useState<keyof typeof results | null>(null),
    [step, setStep] = useState(0),
    [scores, setScores] = useState([0, 0, 0, 0]);
  if(extra)return <ExtraQuiz key={extra.id} quiz={extra} onBack={()=>setExtra(null)}/>;
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
        {extras?.map(q=><button className="card" key={q.id} onClick={()=>setExtra(q)}><QuizPicture {...quizArtwork(q.id)}/><h2>{q.title}</h2><p className="caption">{q.description}</p><span className="caption">{q.questions.length} chess choices</span></button>)}
        {!extras && <Loading error={extraError}/>}
      </div>
    );
  if (step === scenarios.length) {
    const index = scores.indexOf(Math.max(...scores)),
      [title, text] = results[quiz][index];
    return <QuizOutcome id={quiz} title={title} text={text} outcomes={results[quiz].map(([title,text])=>({title,text}))} scores={scores}
      onBack={()=>{setStep(0);setScores([0,0,0,0]);setQuiz(null);}}
      onRetake={()=>{setStep(0);setScores([0,0,0,0]);}}/>;
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
