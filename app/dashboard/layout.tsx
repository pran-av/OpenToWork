import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardFooter from "@/components/dashboard/DashboardFooter";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { DashboardMainCanvas } from "@/components/dashboard/DashboardMainCanvas";

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

  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col bg-orange-50 dark:bg-zinc-950">
        <DashboardHeader />
        <DashboardMainCanvas>{children}</DashboardMainCanvas>
        <DashboardFooter />
      </div>
    </ThemeProvider>
  );
}

