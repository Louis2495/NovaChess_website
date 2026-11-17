import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { base } from "../lib/store";
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
  const [openingTab,setOpeningTab]=useState("Lessons"),[historyTab,setHistoryTab]=useState("Timeline");
  const labels: Record<string,string>={repertoire:"Your repertoire",train:"Train an opening",lessons:"Opening lessons",traps:"Opening lessons",search:"Opening lessons",famous:"History",history:"History",endgames:"Endgame Lessons",encyclopedia:"Encyclopedia",trivia:"Trivia",facts:"Trivia",quizzes:"Quizzes"};
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
        {["lessons","traps","search"].includes(section) ? <>
          <div className="segmented learn-section-tabs" role="group" aria-label="Opening lessons section">{["Lessons","Traps"].map(t=><button key={t} className={(section==="traps"?"Traps":openingTab)===t?"active":""} onClick={()=>{setOpeningTab(t);if(section==="traps")navigate("learn","lessons");}}>{t}</button>)}</div>
          {(section==="traps" || openingTab==="Traps") ? <OpeningTraps/> : <Openings mode="lesson" query={section==="search"?detail.slice(7):""} selectedId={section==="lessons"?detail.slice(8):undefined}/>}
        </> : ["history","famous"].includes(section) ? <>
          <div className="segmented learn-section-tabs" role="group" aria-label="History section">{["Timeline","Famous games"].map(t=><button key={t} className={(section==="famous"?"Famous games":historyTab)===t?"active":""} onClick={()=>{setHistoryTab(t);if(section==="famous")navigate("learn","history");}}>{t}</button>)}</div>
          {(section==="famous" || historyTab==="Famous games") ? <FamousGames/> : <Knowledge section="history"/>}
        </> : section==="encyclopedia" ? <Encyclopedia/> : section==="trivia" || section==="facts" ? <Playground trivia/> : section==="quizzes" ? <Playground/> : section==="repertoire" ? <Repertoire/> : section==="endgames" ? <Endgames/> : <Openings mode={section==="train"?"train":"lesson"}/>}

      </>
    );
  const tiles=[
    {id:"repertoire",title:"Your repertoire",text:`${library.repertoire.length} saved lines`,tile:0},
    {id:"lessons",title:"Opening lessons",text:"Lessons, traps & refutations",tile:1},
    {id:"endgames",title:"Endgame Lessons",text:"17 positions · engine replies",tile:2},
    {id:"train",title:"Train an opening",text:"Practice the next move",tile:3},
    {id:"history",title:"History",text:"Famous games, champions & milestones",tile:4},
    {id:"encyclopedia",title:"Encyclopedia",text:"Motifs, players, events & more",tile:5},
    {id:"quizzes",title:"Quizzes",text:"Choose moves, find your style",tile:6},
    {id:"trivia",title:"Trivia",text:"Test your chess knowledge",tile:7},
  ];
  return <><PageTitle title="Learn"/><div className="learn-groups">{[
    {title:"Lessons & practice",ids:["repertoire","lessons","endgames","train"]},
    {title:"Explore chess",ids:["history","encyclopedia"]},
    {title:"Just for fun",ids:["quizzes","trivia"]},
  ].map(group=><section className="learn-group" key={group.title}><h2 className="learn-group-title">{group.title}</h2><div className="learn-hub">{group.ids.map(id=>tiles.find(t=>t.id===id)!).map(t=><button className="card learn-tile" key={t.id} onClick={()=>navigate("learn",t.id)}><span className="learn-picture" aria-hidden="true" style={{backgroundImage:`url("${base}learn/${t.tile===3?'illustrations.webp':'subjects.webp'}")`,backgroundSize:"400% 200%",backgroundPosition:`${(t.tile%4)*100/3}% ${Math.floor(t.tile/4)*100}%`}}/><h2>{t.title}</h2><p>{t.text}</p></button>)}</div></section>)}</div></>;
}
