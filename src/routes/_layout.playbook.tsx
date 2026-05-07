import { createFileRoute } from "@tanstack/react-router";
import Playbook from "@/pages/Playbook";
export const Route = createFileRoute("/_layout/playbook")({ component: Playbook });
