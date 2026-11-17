export type QuizArtwork = {sheet:string;tile:number};
const themes:Record<string,{sheet:string;start:number;intro:number}>={
 snack:{sheet:'food-villains.webp',start:0,intro:2},villain:{sheet:'food-villains.webp',start:4,intro:7},
 vacation:{sheet:'travel-chat.webp',start:0,intro:3},groupchat:{sheet:'travel-chat.webp',start:4,intro:4},
 pet:{sheet:'animals-weather.webp',start:0,intro:1},weather:{sheet:'animals-weather.webp',start:4,intro:4},
 restaurant:{sheet:'restaurants-wizards.webp',start:0,intro:3},wizard:{sheet:'restaurants-wizards.webp',start:4,intro:5},
 apocalypse:{sheet:'survival-movies.webp',start:0,intro:1},movie:{sheet:'survival-movies.webp',start:4,intro:4},
};
export function quizArtwork(id:string,result?:number):QuizArtwork{
 const theme=themes[id];
 if(theme)return {sheet:theme.sheet,tile:result===undefined?theme.intro:theme.start+result};
 const legacy:Record<string,number[]>={style:[4,5,6,7],princess:[0,1,2,3],alter:[4,7,6,7]};
 return {sheet:'princesses-archetypes.webp',tile:legacy[id]?.[result??0]??4};
}
