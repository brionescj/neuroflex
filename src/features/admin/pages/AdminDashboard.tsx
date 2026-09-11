import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";

import { findRoleByRutAction } from "../actions/search.action";
import { AdminTabs, type AdminTab } from "../components/AdminTabs";
import { StudentsSection } from "../components/StudentsSection";
import { TeachersSection } from "../components/TeachersSection";

export default function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>("students");
  const [searchQuery, setSearchQuery] = useState("");

  async function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();

    if (!searchQuery.trim()) return;

    const result = await findRoleByRutAction(searchQuery);

    if (result.success) {
      setTab(result.data.role === "student" ? "students" : "teachers");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6 text-white">
      <form onSubmit={handleSearchSubmit} className="relative">
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
      <div className={tab === "teachers" ? "" : "hidden"}>
        <TeachersSection searchQuery={searchQuery} isActive={tab === "teachers"} />
      </div>
    </div>
  );
}