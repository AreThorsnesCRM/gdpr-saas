import Header from "@/components/Header";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar kommer senere */}
      <div className="flex-1">
        <Header />
        <main>{children}</main>
      </div>
    </div>
  );
}
