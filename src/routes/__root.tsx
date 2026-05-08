// Picker route only — real routing lives in src/App.tsx (react-router-dom).
import { Outlet, createRootRoute } from "@tanstack/react-router";

function PickerRoot() {
  return <Outlet />;
}

export const Route = createRootRoute({
  component: PickerRoot,
});
