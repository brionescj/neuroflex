import { LogoutButton } from "@/features/auth/components";
import { useAuth } from "@/context";

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 text-white">
      <h1 className="text-4xl font-bold">Dashboard Administrador</h1>

      <p className="text-zinc-400">{user?.displayName}</p>

      <LogoutButton />
    </div>
  );
}
