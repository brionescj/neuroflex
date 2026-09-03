import { useState } from "react";
import { Outlet } from "react-router-dom";

import { Breadcrumb } from "./Breadcrumb";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex min-h-screen flex-col md:pl-64">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 space-y-4 p-6">
          <Breadcrumb />
          <Outlet />
        </main>
      </div>
    </div>
  );
}