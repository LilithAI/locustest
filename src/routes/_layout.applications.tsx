import { createFileRoute } from "@tanstack/react-router";
import ApplicationTracker from "@/pages/ApplicationTracker";
export const Route = createFileRoute("/_layout/applications")({ component: ApplicationTracker });
