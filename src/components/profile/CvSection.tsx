import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Download, Loader2, FileText, Sparkles } from "lucide-react";
import CvReviewModal, { type ParsedCv, type CurrentProfile } from "./CvReviewModal";

const CV_MAX_BYTES = 5 * 1024 * 1024;

interface Props {
  userId: string;
  cvUrl: string | null;
  cvUploadedAt: string | null;
  setCvUrl: (v: string | null) => void;
  setCvUploadedAt: (v: string | null) => void;
  current: CurrentProfile;
  onParsedApplied: () => void;
}

export default function CvSection({ userId, cvUrl, cvUploadedAt, setCvUrl, setCvUploadedAt, current, onParsedApplied }: Props) {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedCv | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = () => fileRef.current?.click();

  const isParsedEmpty = (p: ParsedCv) =>
    !p.bio?.trim() &&
    !p.college?.trim() &&
    !p.degree &&
    !p.graduation_year &&
    (p.subjects_of_interest?.length ?? 0) === 0 &&
    (p.internships?.length ?? 0) === 0 &&
    (p.moots?.length ?? 0) === 0 &&
    (p.publications?.length ?? 0) === 0;

  const runParse = async (fromReparse: boolean = false) => {
    if (!userId || reviewOpen) return; // ignore if a review session is in progress
    setParsing(true);
    if (fromReparse) toast.info("Parsing CV with AI (this may take 10-30 seconds)");

    // Client-side timeout — Gemini occasionally hangs on malformed PDFs.
    // Without this, the parsing spinner could spin indefinitely.
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 60_000);

    try {
      const { data, error } = await supabase.functions.invoke("parse-cv", {
        body: { cv_storage_path: `${userId}/cv.pdf` },
      });
      if (error) {
        // supabase wraps non-2xx as FunctionsHttpError; the JSON error body lives on error.context.response
        let body: { error?: string; retryable?: boolean } | null = null;
        try {
          const resp = (error as unknown as { context?: { response?: Response } })?.context?.response;
          if (resp) body = await resp.clone().json();
        } catch {
          // ignore parse failure, fall back below
        }
        if (!body) body = data as { error?: string; retryable?: boolean } | null;
        // Surface the actual server-side message so testers know whether it's
        // rate-limit, invalid PDF, or something they should retry.
        const msg = body?.error || error.message || "CV parsing failed — please fill manually";
        toast.error(msg);
        return;
      }
      const result = data as ParsedCv;
      if (!result || isParsedEmpty(result)) {
        toast.info("CV uploaded but we couldn't extract much from it. Please fill sections manually.");
        return;
      }
      setParsed(result);
      setReviewOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "CV parsing failed — please fill manually";
      toast.error(msg);
    } finally {
      clearTimeout(timeoutId);
      setParsing(false);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("CV must be a PDF"); return; }
    if (file.size > CV_MAX_BYTES) { toast.error("CV must be 5 MB or smaller"); return; }
    if (reviewOpen) {
      toast.info("Finish your current CV review first.");
      return;
    }

    setUploading(true);
    const path = `${userId}/cv.pdf`;
    const { error: upErr } = await supabase.storage.from("cvs").upload(path, file, { upsert: true, contentType: "application/pdf" });
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }

    const uploadedAt = new Date().toISOString();
    const { error: updErr } = await supabase.from("profiles").update({ cv_url: path, cv_uploaded_at: uploadedAt }).eq("id", userId);
    setUploading(false);
    if (updErr) { toast.error(updErr.message); return; }
    setCvUrl(path);
    setCvUploadedAt(uploadedAt);
    toast.success("CV uploaded — parsing with AI (this may take 10-30 seconds)");
    // Fire parse independently of the upload result
    runParse();
  };

  const download = async () => {
    if (!cvUrl) return;
    setDownloading(true);
    const { data, error } = await supabase.storage.from("cvs").createSignedUrl(cvUrl, 60);
    setDownloading(false);
    if (error || !data?.signedUrl) { toast.error(error?.message || "Couldn't generate download link"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">CV</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleChange} />

        {cvUrl ? (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card/50">
            <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">CV on file</p>
              {cvUploadedAt && (
                <p className="text-xs text-muted-foreground">Uploaded {new Date(cvUploadedAt).toLocaleString()}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={download} disabled={downloading}>
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  <span className="ml-2">Download</span>
                </Button>
                <Button size="sm" onClick={pick} disabled={uploading || parsing}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <span className="ml-2">Replace</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => runParse(true)} disabled={parsing || uploading}>
                  {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span className="ml-2">{parsing ? "Parsing…" : "Parse again"}</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Upload your CV as a PDF (max 5 MB). Only you can access it. We'll parse it with AI to pre-fill your profile sections.</p>
            <Button size="sm" onClick={pick} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span className="ml-2">Upload CV</span>
            </Button>
          </div>
        )}
      </CardContent>

      {parsed && (
        <CvReviewModal
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          userId={userId}
          parsed={parsed}
          current={current}
          onSaved={onParsedApplied}
        />
      )}
    </Card>
  );
}
