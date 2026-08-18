import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
        <Outlet />
      </div>
    </div>
  );
}
