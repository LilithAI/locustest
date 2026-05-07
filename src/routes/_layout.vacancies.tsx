import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_layout/vacancies")({
  beforeLoad: () => { throw redirect({ to: "/opportunities" }); },
});
