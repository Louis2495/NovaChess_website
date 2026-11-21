import { useEffect, useState, type CSSProperties } from "react";
import { base, today } from "../lib/store";
type Meme = {
  id: string;
  image: string;
  top: string;
  bottom: string;
  status: string;
  alt?: string;
  width?: number;
  height?: number;
};
export default function DailyMeme({onAspectChange}:{onAspectChange?:(aspect:number)=>void}={}) {
  const [candidates, setCandidates] = useState<Meme[]>([]);
  const [date, setDate] = useState(today);
  useEffect(() => {
    const update = () => setDate(today());
    const timer = setInterval(update, 30000);
    window.addEventListener("focus", update);
    return () => { clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${base}memes/candidates.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Memes unavailable");
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setCandidates(data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const eligible = candidates.filter((m) => m.status !== "rejected");
  const day = Math.floor(Date.parse(date + "T12:00:00Z") / 86400000);
  const meme =
    eligible[((day % eligible.length) + eligible.length) % eligible.length];
  useEffect(()=>{if(meme)onAspectChange?.((meme.width||720)/(meme.height||600));},[meme?.id,meme?.width,meme?.height,onAspectChange]);
  if(!meme)return null;
  return (
    <section
      className="daily-meme"
      aria-label="Chess meme"
      data-meme-id={meme.id}
      style={{ "--meme-aspect": (meme.width || 720) / (meme.height || 600) } as CSSProperties}
    >
      <img
        className="daily-meme-image"
        src={`${base}memes/${meme.image}`}
        alt={meme.alt || `${meme.top} ${meme.bottom}`}
        width={meme.width || 720}
        height={meme.height || 600}
        loading="lazy"
      />
    </section>
  );
}
