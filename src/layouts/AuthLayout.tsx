import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-950 px-4 py-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:gap-6 sm:p-8">
        <Outlet />
      </div>
    </div>
  );
}
