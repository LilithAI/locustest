import { createFileRoute } from "@tanstack/react-router";
import FirmProfile from "@/pages/FirmProfile";
export const Route = createFileRoute("/_layout/directory/firm/$slug")({ component: FirmProfile });
