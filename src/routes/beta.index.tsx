import { createFileRoute } from "@tanstack/react-router";
import BetaChecklist from "@/pages/BetaChecklist";
export const Route = createFileRoute("/beta/")({ component: BetaChecklist });
