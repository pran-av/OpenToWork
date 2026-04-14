import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardFooter from "@/components/dashboard/DashboardFooter";
import LinkIdentityBanner from "@/components/dashboard/LinkIdentityBanner";
import BackButton from "@/components/dashboard/BackButton";
import { ThemeProvider } from "@/components/ui/theme-provider";

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
      <div className="flex min-h-screen flex-col bg-orange-50 dark:bg-black">
        <DashboardHeader />
        <BackButton />
        <LinkIdentityBanner />
        <main
          className="flex-1 container mx-auto bg-orange-50 px-4 py-8 [background-image:radial-gradient(circle_at_center,rgba(120,53,9,0.11)_1px,transparent_1px)] [background-size:18px_18px] dark:bg-black dark:[background-image:radial-gradient(circle_at_center,rgba(244,244,245,0.07)_1px,transparent_1px)]"
        >
          {children}
        </main>
        <DashboardFooter />
      </div>
    </ThemeProvider>
  );
}

