import { Sidebar } from "./_components/sidebar";
import { Topbar } from "./_components/topbar";
import { GridBg } from "@/components/ui/grid-bg";
import { MobileNavProvider } from "./_components/mobile-nav-context";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileNavProvider>
      <div className="relative min-h-screen">
        <GridBg fade={false} className="opacity-40" />
        <Sidebar />
        <div className="md:pl-60">
          <Topbar />
          <main className="relative px-4 sm:px-6 md:px-8 py-6 md:py-8">
            {children}
          </main>
        </div>
      </div>
    </MobileNavProvider>
  );
}
