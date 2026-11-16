import { useData, today } from "../lib/store";
import { Piece } from "./Board";
type Meme = {
  id: string;
  top: string;
  bottom: string;
  piece: string;
  reply: string;
};
export default function DailyMeme() {
  const { data } = useData<Meme[]>("memes");
  if (!data) return null;
  const day = Math.floor(Date.parse(today() + "T12:00:00Z") / 86400000),
    meme = data[((day % data.length) + data.length) % data.length];
  return (
    <section className="daily-meme" aria-label="Daily chess meme">
      <div className="home-section-heading">
        <h2>Daily meme</h2>
      </div>
      <div className="meme-panels">
        <div>
          <p>{meme.top}</p>
          <Piece symbol={meme.piece} />
          <span className="meme-board-floor" />
        </div>
        <div>
          <p>{meme.bottom}</p>
          <Piece symbol={meme.reply} />
          <span className="meme-board-floor" />
        </div>
      </div>
    </section>
  );
}
