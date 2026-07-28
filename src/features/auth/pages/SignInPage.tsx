import { LoginForm } from "../components/LoginForm";

export function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 p-8 shadow-xl">
        <LoginForm />
      </div>
    </main>
  );
}