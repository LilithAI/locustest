import { createFileRoute } from "@tanstack/react-router";
import AdminAdmins from "@/pages/AdminAdmins";
export const Route = createFileRoute("/_layout/admin/admins")({ component: AdminAdmins });
