import { createFileRoute } from "@tanstack/react-router";
import PlaybookGuide from "@/pages/PlaybookGuide";
export const Route = createFileRoute("/_layout/playbook/$slug")({ component: PlaybookGuide });
