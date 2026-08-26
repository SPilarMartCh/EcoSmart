import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/eco/DashboardShell";

export const Route = createFileRoute("/dashboard")({
  component: DashboardShell,
});
