import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

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
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

