import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import firmsData from "@/data/firms.json";
import { STATUS_OPTIONS } from "./StatusPill";
import { METHOD_OPTIONS } from "./methodMeta";
import type { Database } from "@/integrations/supabase/types";

type Application = Database["public"]["Tables"]["profile_applications"]["Row"];
type Method = Database["public"]["Enums"]["application_method"];
type Status = Database["public"]["Enums"]["application_status"];

type FirmRow = { name: string };

const ALL_FIRM_NAMES: string[] = Array.from(
  new Set((firmsData as FirmRow[]).map((f) => f.name).filter(Boolean)),
).sort((a, b) => a.localeCompare(b));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  editing?: Application | null;
  onSaved: () => void;
  prefillFirm?: string | null;
  prefillRole?: string | null;
  prefillNotes?: string | null;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function LogApplicationDialog({
  open,
  onOpenChange,
  userId,
  editing,
  onSaved,
  prefillFirm,
  prefillRole,
  prefillNotes,
}: Props) {
  const [firmName, setFirmName] = useState("");
  const [role, setRole] = useState("");
  const [appliedOn, setAppliedOn] = useState(todayISO());
  const [method, setMethod] = useState<Method>("email");
  const [status, setStatus] = useState<Status>("sent");
  const [notes, setNotes] = useState("");
  const [firmPickerOpen, setFirmPickerOpen] = useState(false);
  const [firmQuery, setFirmQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setFirmName(editing.firm_name_snapshot);
      setRole(editing.role);
      setAppliedOn(editing.applied_on);
      setMethod(editing.method);
      setStatus(editing.status);
      setNotes(editing.notes ?? "");
    } else {
      setFirmName(prefillFirm ?? "");
      setRole(prefillRole ?? "");
      setAppliedOn(todayISO());
      setMethod("email");
      setStatus("sent");
      setNotes(prefillNotes ?? "");
    }
    setFirmQuery("");
  }, [open, editing, prefillFirm, prefillRole, prefillNotes]);

  const filteredFirms = useMemo(() => {
    const q = firmQuery.trim().toLowerCase();
    if (!q) return ALL_FIRM_NAMES.slice(0, 30);
    const matches = ALL_FIRM_NAMES.filter((n) => n.toLowerCase().includes(q));
    return matches.slice(0, 30);
  }, [firmQuery]);

  const exactMatch = useMemo(
    () =>
      ALL_FIRM_NAMES.some(
        (n) => n.toLowerCase() === firmQuery.trim().toLowerCase(),
      ),
    [firmQuery],
  );

  const handleSubmit = async () => {
    if (!firmName.trim()) return toast.error("Pick or type a firm name");
    if (!role.trim()) return toast.error("Role is required");
    if (!appliedOn) return toast.error("Date is required");
    if (notes.length > 2000) return toast.error("Notes too long (2000 char max)");

    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from("profile_applications")
        .update({
          firm_name_snapshot: firmName.trim(),
          role: role.trim(),
          applied_on: appliedOn,
          method,
          status,
          notes: notes.trim() || null,
        })
        .eq("id", editing.id);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Application updated");
    } else {
      const { error } = await supabase.from("profile_applications").insert({
        user_id: userId,
        firm_name_snapshot: firmName.trim(),
        role: role.trim(),
        applied_on: appliedOn,
        method,
        status,
        notes: notes.trim() || null,
      });
      setSaving(false);
      if (error) return toast.error(error.message);
      void track("application_logged", { method, status });
      toast.success("Application logged");
    }
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-extrabold">
            {editing ? "Edit application" : "Log application"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Firm */}
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-widest">Firm</Label>
            <Popover open={firmPickerOpen} onOpenChange={setFirmPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:border-foreground/30"
                >
                  <span className={firmName ? "text-foreground" : "text-muted-foreground"}>
                    {firmName || "Pick or type a firm…"}
                  </span>
                  <ChevronsUpDown size={14} className="text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <div className="border-b border-border p-2">
                  <Input
                    autoFocus
                    value={firmQuery}
                    onChange={(e) => setFirmQuery(e.target.value)}
                    placeholder="Search firms…"
                    className="h-8"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {firmQuery.trim() && !exactMatch && (
                    <button
                      type="button"
                      onClick={() => {
                        setFirmName(firmQuery.trim());
                        setFirmPickerOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span>
                        Use “<span className="font-semibold">{firmQuery.trim()}</span>”
                      </span>
                      <span className="font-mono text-[10px] uppercase text-muted-foreground">
                        custom
                      </span>
                    </button>
                  )}
                  {filteredFirms.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setFirmName(n);
                        setFirmPickerOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="truncate">{n}</span>
                      {firmName === n && <Check size={14} className="text-accent" />}
                    </button>
                  ))}
                  {filteredFirms.length === 0 && !firmQuery.trim() && (
                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                      Type to search 3,890+ firms
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-widest">Role</Label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Summer Associate, Intern"
            />
          </div>

          {/* Date + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-widest">Applied on</Label>
              <Input
                type="date"
                value={appliedOn}
                max={todayISO()}
                onChange={(e) => setAppliedOn(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-widest">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Method */}
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-widest">Method</Label>
            <div className="flex flex-wrap gap-2">
              {METHOD_OPTIONS.map(({ value, label, Icon }) => {
                const active = method === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMethod(value)}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="font-mono text-[10px] uppercase tracking-widest">
                Notes (private)
              </Label>
              <span className="font-mono text-[10px] text-muted-foreground">
                {notes.length}/2000
              </span>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
              placeholder="Contact name, JD link, follow-up plan…"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? "Saving…" : editing ? "Save changes" : "Log application"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
