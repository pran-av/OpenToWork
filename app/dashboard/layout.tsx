import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { DashboardClientShell } from "./DashboardClientShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return <DashboardClientShell>{children}</DashboardClientShell>;
}

