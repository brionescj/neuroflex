import { useAuth } from "@/context";

export default function TeacherDashboard() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 text-center text-white">
      <h1 className="text-2xl font-bold sm:text-3xl md:text-4xl">
        Dashboard Docente
      </h1>

      <p className="text-zinc-400">{user?.displayName}</p>
    </div>
  );
}