// Picker route only — real routing lives in src/App.tsx (react-router-dom).
import { createFileRoute } from "@tanstack/react-router";

function PickerStub() {
  return null;
}

export const Route = createFileRoute("/opportunities")({
  component: PickerStub,
  head: () => ({
    meta: [{ name: "robots", content: "noindex" }],
  }),
});

export const pickerPath = "/opportunities";
