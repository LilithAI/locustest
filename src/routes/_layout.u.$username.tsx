import { createFileRoute } from "@tanstack/react-router";
import PublicProfile from "@/pages/PublicProfile";
export const Route = createFileRoute("/_layout/u/$username")({ component: PublicProfile });
