import AdminAccounts from "../components/AdminAccounts";
import Appearance from "../components/Appearance";
import { FederationProfiles } from "../components/FederationProfiles";
import { useEffect, useState } from "react";
import { Save, Upload, Trash2, SlidersHorizontal, Play } from "lucide-react";
import Controls from "./Controls";
import OnlineAccount from "../components/OnlineAccount";
import { online, useOnlineSession, useSiteAdmin } from "../lib/online";
import { useApp } from "../lib/context";
import { imageFile, pieceUrl } from "../lib/store";
import { regions } from "../lib/regions";
import {
  ChoiceSelect,
  PageTitle,
  Card,
  Button,
  Field,
  Toggle,
} from "../components/UI";
export default function Profile({ embedded = false }: { embedded?: boolean }) {
  const {
    library,
    setLibrary,
    appearance,
    setAppearance,
    notify,
    detail,
    navigate,
  } = useApp();
  const [name, setName] = useState(library.profile.name),
    [bio, setBio] = useState(library.profile.bio || ""),
    [country, setCountry] = useState(library.profile.country);
  const { session } = useOnlineSession(),{isAdmin}=useSiteAdmin();
  useEffect(() => {
    if (!online || !session) return;
    online
      .from("profiles")
      .select("username,bio,country,avatar")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data && !data.username.startsWith("player_")) {
          setName(data.username);
          setBio(data.bio);
          setCountry(data.country);
          setLibrary((l) => ({
            ...l,
            profile: {
              ...l.profile,
              name: data.username,
              bio: data.bio,
              country: data.country,
              avatar: data.avatar,
            },
          }));
        }
      });
  }, [session?.user.id]);
  const avatar = library.profile.avatar;
  function setAvatar(avatar: string) {
    setLibrary((l) => ({ ...l, profile: { ...l.profile, avatar } }));
  }
  return (
    <>
      {!embedded && <PageTitle title="Profile" />}
      <div className="segmented page-segments" aria-label="Profile sections">
        <button
          className={!["controls", "customize", "admin"].includes(detail) ? "active" : ""}
          onClick={() => navigate("profile")}
        >
          Account
        </button>
        <button
          className={detail === "controls" ? "active" : ""}
          onClick={() => navigate("profile", "controls")}
        >
          Controls
        </button>
        <button className={detail === "customize" ? "active" : ""} onClick={() => navigate("profile", "customize")}>Customize</button>
      {isAdmin && <button className={detail === "admin" ? "active" : ""} onClick={()=>navigate("profile","admin")}>Admin</button>}
      </div>
      {detail === "admin" ? <AdminAccounts/> : detail === "controls" ? (
        <Controls embedded />
      ) : detail === "customize" ? (
        <Appearance embedded onClose={() => navigate("profile")} />
      ) : (
        <div className="profile-page-layout">
          <Card className="profile-editor">
            <div className="profile-cover" />
            <div className="profile-picture-row">
              <div className="profile-avatar">
                {avatar ? (
                  <img src={avatar} alt="Your profile picture" />
                ) : (
                  <img
                    src={pieceUrl("wP", "Chessnut")}
                    className="default-avatar"
                    alt="Default pawn avatar"
                  />
                )}
              </div>
              <div className="button-row">
                <label
                  className="profile-photo-upload file-button"
                  title="Upload profile picture"
                >
                  <Upload size={16} />
                  <input
                    aria-label="Upload profile picture"
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file)
                        try {
                          setAvatar(await imageFile(file, 256));
                        } catch (error) {
                          notify((error as Error).message);
                        }
                      e.target.value = "";
                    }}
                  />
                </label>
                {avatar && (
                  <Button
                    className="text-button"
                    aria-label="Remove profile picture"
                    onClick={() => setAvatar("")}
                  >
                    <Trash2 size={17} />
                  </Button>
                )}
              </div>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!name.trim()) return;
                setLibrary((l) => ({
                  ...l,
                  profile: {
                    ...l.profile,
                    name: name.trim(),
                    bio: bio.trim(),
                    country,
                  },
                }));
                if (online && session) {
                  const { error } = await online
                    .from("profiles")
                    .update({
                      username: name.trim(),
                      bio: bio.trim(),
                      country,
                      avatar,
                    })
                    .eq("id", session.user.id);
                  if (error) {
                    notify(error.message);
                    return;
                  }
                }
                notify("Profile saved.");
              }}
            >
              <Field label="Username">
                <input
                  required
                  value={name}
                  maxLength={32}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="nickname"
                />
              </Field>
              <Field label="Bio">
                <textarea
                  value={bio}
                  maxLength={280}
                  rows={3}
                  onChange={(e) => setBio(e.target.value)}
                />
              </Field>
              <Field label="Country (optional)">
                <ChoiceSelect
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <option value="">Not set</option>
                  {regions.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </ChoiceSelect>
              </Field>
              <Button type="submit" disabled={!name.trim()}>
                <Save size={16} />
                Save profile
              </Button>
            </form>
          </Card>
          <div className="profile-side">
            <Card>
              <div className="card-heading">
                <h2>Settings</h2>
                <SlidersHorizontal size={19} />
              </div>
              <Toggle
                label="Auto-queen"
                checked={appearance.autoQueen}
                onChange={(autoQueen) =>
                  setAppearance((a) => ({ ...a, autoQueen }))
                }
              />
              <Toggle
                label="Premoves"
                checked={appearance.premoves}
                onChange={(premoves) =>
                  setAppearance((a) => ({ ...a, premoves }))
                }
              />
              <Toggle label="Show memes" checked={appearance.showMemes} onChange={showMemes=>setAppearance(a=>({...a,showMemes}))}/>
              <Toggle
                label="Show legal moves"
                checked={appearance.legalMoves}
                onChange={(legalMoves) => setAppearance(a => ({ ...a, legalMoves }))}
              />
              <Toggle
                label="Confirm resign"
                checked={appearance.confirmResign}
                onChange={(confirmResign) =>
                  setAppearance((a) => ({ ...a, confirmResign }))
                }
              />
              <Toggle
                label="Move sounds"
                checked={appearance.sound}
                onChange={(sound) => setAppearance((a) => ({ ...a, sound }))}
              />
              <div className="move-sound-upload">
                <label className="file-button">
                  <Upload size={15}/><span>{appearance.customMoveSound ? "Replace sound" : "Upload sound"}</span>
                  <input type="file" accept="audio/*" aria-label="Upload move sound" onChange={e => {
                    const file=e.target.files?.[0]; e.target.value=""; if(!file) return;
                    if(file.size>1024*1024 || !(file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.name))) { notify("Choose an audio file under 1 MB."); return; }
                    const reader=new FileReader(); reader.onerror=()=>notify("Could not read this sound.");
                    reader.onload=()=>{ setAppearance(a=>({...a,customMoveSound:String(reader.result),sound:true})); notify("Move sound updated."); }; reader.readAsDataURL(file);
                  }}/>
                </label>
                {appearance.customMoveSound && <>
                  <button className="icon-btn" aria-label="Preview move sound" onClick={()=>{const audio=new Audio(appearance.customMoveSound); audio.volume=appearance.volume; void audio.play().catch(()=>notify("This audio file could not be played."));}}><Play size={15}/></button>
                  <button className="icon-btn" aria-label="Use default move sound" onClick={()=>setAppearance(a=>({...a,customMoveSound:undefined}))}><Trash2 size={15}/></button>
                </>}
              </div>
            </Card>
          </div>
          <div className="profile-online"><OnlineAccount /></div>
          <FederationProfiles />
        </div>
      )}
    </>
  );
}
