import { Sidebar } from "./_components/sidebar";
import { Topbar } from "./_components/topbar";
import { GridBg } from "@/components/ui/grid-bg";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      <GridBg fade={false} className="opacity-40" />
      <Sidebar />
      <div className="pl-60">
        <Topbar />
        <main className="relative px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
