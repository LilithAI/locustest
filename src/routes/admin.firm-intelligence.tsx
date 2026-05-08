// Picker route only — real routing lives in src/App.tsx (react-router-dom).
import { createFileRoute } from "@tanstack/react-router";

function PickerStub() {
  return null;
}

export const Route = createFileRoute("/admin/firm-intelligence")({
  component: PickerStub,
  head: () => ({
    meta: [{ name: "robots", content: "noindex" }],
  }),
});

export const pickerPath = "/admin/firm-intelligence";
