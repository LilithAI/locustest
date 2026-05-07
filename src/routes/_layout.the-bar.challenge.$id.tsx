import { createFileRoute } from "@tanstack/react-router";
import TheBarChallenge from "@/pages/TheBarChallenge";
export const Route = createFileRoute("/_layout/the-bar/challenge/$id")({ component: TheBarChallenge });
