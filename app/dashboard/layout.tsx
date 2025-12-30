import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardFooter from "@/components/dashboard/DashboardFooter";

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
    <div className="flex min-h-screen flex-col bg-orange-50 dark:bg-black">
      <DashboardHeader />
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
      <DashboardFooter />
    </div>
  );
}

