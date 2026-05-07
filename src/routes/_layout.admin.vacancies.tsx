import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_layout/admin/vacancies")({
  beforeLoad: () => { throw redirect({ to: "/admin/opportunities" }); },
});
