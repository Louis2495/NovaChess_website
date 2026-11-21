import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { regions } from "../lib/regions";
import { base, imageFile } from "../lib/store";
import { Field } from "./UI";

const choices = [
  ["pawn", "Sunglasses pawn"],
  ["rook", "Keykeeper rook"],
  ["knight", "Goofy knight"],
  ["bishop", "Bow-tie bishop"],
] as const;

export default function SignupProfileFields({ country, avatar, onCountry, onAvatar, onBusy, onError }: {
  country: string;
  avatar: string;
  onCountry: (value: string) => void;
  onAvatar: (value: string) => void;
  onBusy: (busy: boolean) => void;
  onError: (message: string) => void;
}) {
  const [preset, setPreset] = useState<string | null>(null);
  const selection = useRef(0);

  async function choosePhoto(load: () => Promise<File>, id: string | null) {
    const request = ++selection.current;
    onBusy(true);
    onError("");
    try {
      const photo = await imageFile(await load(), 192);
      if (request !== selection.current) return;
      setPreset(id);
      onAvatar(photo);
    } catch {
      if (request === selection.current) onError("That picture couldn’t be loaded. Try an image under 15 MB or choose a chess avatar.");
    } finally {
      if (request === selection.current) onBusy(false);
    }
  }

  return <>
    <Field label="Country of origin">
      <select required autoComplete="country" value={country} onChange={e => onCountry(e.target.value)}>
        <option value="">Choose a country</option>
        {regions.map(region => <option key={region.code} value={region.code}>{region.name}</option>)}
      </select>
    </Field>
    <fieldset className="signup-avatar-options">
      <legend>Profile picture</legend>
      <div className="signup-avatar-grid">
        {choices.map(([id, label]) => {
          const url = `${base}avatars/${id}.webp`;
          return <button key={id} type="button" aria-label={label} aria-pressed={preset === id} title={label}
            onClick={() => void choosePhoto(async () => {
              const response = await fetch(url);
              if (!response.ok) throw Error("Avatar unavailable");
              const image = await response.blob();
              return new File([image], `${id}.webp`, { type: image.type });
            }, id)}>
            <img src={url} alt="" />
          </button>;
        })}
      </div>
      <div className="signup-upload-row">
        {avatar && !preset && <img src={avatar} alt="Selected profile picture" />}
        <label>
          <Upload size={17} aria-hidden="true" />
          <span>Upload a photo</span>
          <input type="file" aria-label="Upload a profile picture" accept="image/*" onChange={e => {
            const file = e.currentTarget.files?.[0];
            if (file) void choosePhoto(async () => file, null);
            e.currentTarget.value = "";
          }} />
        </label>
      </div>
    </fieldset>
  </>;
}
