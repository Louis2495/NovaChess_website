import { useEffect, useState } from "react";
import { base, today } from "../lib/store";
type Meme = {
  id: string;
  image: string;
  top: string;
  bottom: string;
  status: string;
};
export default function DailyMeme() {
  const [candidates, setCandidates] = useState<Meme[]>([]);
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
  if (!eligible.length) return null;
  const day = Math.floor(Date.parse(today() + "T12:00:00Z") / 86400000);
  const meme =
    eligible[((day % eligible.length) + eligible.length) % eligible.length];
  return (
    <section
      className="daily-meme"
      aria-label="Chess meme"
      data-meme-id={meme.id}
    >
      <img
        className="daily-meme-image"
        src={`${base}memes/${meme.image}`}
        alt={`${meme.top} ${meme.bottom}`}
        width={720}
        height={600}
        loading="lazy"
      />
    </section>
  );
}
