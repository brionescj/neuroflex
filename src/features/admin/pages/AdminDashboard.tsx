import { Search } from "lucide-react";
import { useState } from "react";

import { AdminTabs, type AdminTab } from "../components/AdminTabs";
import { AdminsSection } from "../components/AdminsSection";
import { IncompleteStudentsSection } from "../components/IncompleteStudentsSection";
import { StudentsSection } from "../components/StudentsSection";

export default function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>("students");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6 text-white">
      <form onSubmit={(event) => event.preventDefault()} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre o RUT..."
          className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-zinc-500"
        />
      </form>

      <AdminTabs tab={tab} onChange={setTab} />

      <div className={tab === "students" ? "" : "hidden"}>
        <StudentsSection searchQuery={searchQuery} isActive={tab === "students"} />
      </div>
      <div className={tab === "incomplete" ? "" : "hidden"}>
        <IncompleteStudentsSection searchQuery={searchQuery} isActive={tab === "incomplete"} />
      </div>
      <div className={tab === "admins" ? "" : "hidden"}>
        <AdminsSection searchQuery={searchQuery} isActive={tab === "admins"} />
      </div>
    </div>
  );
}
