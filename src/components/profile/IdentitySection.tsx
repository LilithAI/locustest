import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Trash2, Loader2 } from "lucide-react";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const BIO_MAX = 280;
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

interface Props {
  userId: string;
  displayName: string;
  setDisplayName: (v: string) => void;
  username: string;
  setUsername: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  avatarUrl: string | null;
  setAvatarUrl: (v: string | null) => void;
}

export default function IdentitySection({ userId, displayName, setDisplayName, username, setUsername, bio, setBio, avatarUrl, setAvatarUrl }: Props) {
  const [savingDisplay, setSavingDisplay] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveDisplayName = async () => {
    if (!displayName.trim()) { toast.error("Display name can't be empty"); return; }
    setSavingDisplay(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("id", userId);
    setSavingDisplay(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const saveUsername = async () => {
    const u = username.trim().toLowerCase();
    if (!USERNAME_RE.test(u)) { toast.error("Username must be 3–20 chars: lowercase letters, numbers, underscore"); return; }
    setSavingUsername(true);
    const { error } = await supabase.from("profiles").update({ username: u }).eq("id", userId);
    setSavingUsername(false);
    if (error) {
      if (error.code === "23505" || /duplicate|unique/i.test(error.message)) toast.error("Username already taken");
      else toast.error(error.message);
      return;
    }
    setUsername(u);
    toast.success("Saved");
  };

  const saveBio = async () => {
    if (bio.length > BIO_MAX) { toast.error(`Bio must be ${BIO_MAX} chars or less`); return; }
    setSavingBio(true);
    const { error } = await supabase.from("profiles").update({ bio: bio.trim() || null }).eq("id", userId);
    setSavingBio(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const handleAvatarPick = () => fileRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) { toast.error("Avatar must be PNG, JPEG, or WebP"); return; }
    if (file.size > AVATAR_MAX_BYTES) { toast.error("Avatar must be 2 MB or smaller"); return; }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || (file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg");
    const path = `${userId}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
    if (upErr) { setUploadingAvatar(false); toast.error(upErr.message); return; }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${pub.publicUrl}?t=${Date.now()}`;
    const { error: updErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
    setUploadingAvatar(false);
    if (updErr) { toast.error(updErr.message); return; }
    setAvatarUrl(publicUrl);
    toast.success("Avatar updated");
  };

  const handleRemoveAvatar = async () => {
    if (!avatarUrl) return;
    setUploadingAvatar(true);
    // Try removing common extensions; ignore failures
    await Promise.all(["png", "jpg", "jpeg", "webp"].map((ext) => supabase.storage.from("avatars").remove([`${userId}/avatar.${ext}`])));
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
    setUploadingAvatar(false);
    if (error) { toast.error(error.message); return; }
    setAvatarUrl(null);
    toast.success("Avatar removed");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Identity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border border-border">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="Avatar" /> : null}
            <AvatarFallback className="bg-muted text-muted-foreground">
              {(displayName || username || "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} />
            <Button type="button" variant="outline" size="sm" onClick={handleAvatarPick} disabled={uploadingAvatar}>
              {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span className="ml-2">{avatarUrl ? "Replace" : "Upload"}</span>
            </Button>
            {avatarUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemoveAvatar} disabled={uploadingAvatar}>
                <Trash2 className="h-4 w-4" />
                <span className="ml-2">Remove</span>
              </Button>
            )}
          </div>
        </div>

        {/* Display name */}
        <div className="space-y-2">
          <Label htmlFor="display-name">Display name</Label>
          <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How you appear publicly" maxLength={60} />
          <Button onClick={saveDisplayName} disabled={savingDisplay} size="sm">Save display name</Button>
        </div>

        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
            placeholder="lowercase, 3–20 chars"
            maxLength={20}
          />
          {username && (
            <p className="text-xs text-muted-foreground">your profile: locus.legal/u/{username}</p>
          )}
          <Button onClick={saveUsername} disabled={savingUsername} size="sm">Save username</Button>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="bio">Bio</Label>
            <span className={`text-xs ${bio.length > BIO_MAX ? "text-destructive" : "text-muted-foreground"}`}>{bio.length}/{BIO_MAX}</span>
          </div>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short blurb about you" maxLength={BIO_MAX + 50} rows={3} />
          <Button onClick={saveBio} disabled={savingBio} size="sm">Save bio</Button>
        </div>
      </CardContent>
    </Card>
  );
}
