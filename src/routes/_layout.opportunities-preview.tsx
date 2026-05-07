import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_layout/opportunities-preview")({
  beforeLoad: () => { throw redirect({ to: "/opportunities" }); },
});
