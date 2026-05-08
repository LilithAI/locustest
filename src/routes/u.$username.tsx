// Picker route only — real routing lives in src/App.tsx (react-router-dom).
import { createFileRoute } from "@tanstack/react-router";

function PickerStub() {
  return null;
}

export const Route = createFileRoute("/u/$username")({
  component: PickerStub,
  head: () => ({
    meta: [{ name: "robots", content: "noindex" }],
  }),
});

export const pickerPath = "/u/:username";
