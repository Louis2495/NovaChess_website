import { FederationProfiles } from "../components/FederationProfiles";
import { useEffect, useState } from "react";
import { Save, Upload, Trash2, SlidersHorizontal } from "lucide-react";
import Controls from "./Controls";
import OnlineAccount from "../components/OnlineAccount";
import { online, useOnlineSession } from "../lib/online";
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
    openAppearance,
    detail,
    navigate,
  } = useApp();
  const [name, setName] = useState(library.profile.name),
    [bio, setBio] = useState(library.profile.bio || ""),
    [country, setCountry] = useState(library.profile.country);
  const { session } = useOnlineSession();
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
          className={detail !== "controls" ? "active" : ""}
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
      </div>
      {detail === "controls" ? (
        <Controls embedded />
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
            <OnlineAccount />
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
              <Button className="secondary" onClick={openAppearance}>
                Customize
              </Button>
            </Card>
          </div>
          <FederationProfiles />
        </div>
      )}
    </>
  );
}
