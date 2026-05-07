import { createFileRoute } from "@tanstack/react-router";
import AppHome from "@/pages/AppHome";
export const Route = createFileRoute("/_layout/app")({ component: AppHome });
