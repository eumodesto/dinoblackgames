import type { Metadata } from "next";
import Link from "next/link";
import { PasswordInput } from "@/components/ui/PasswordInput";

export const metadata: Metadata = {
  title: "Entrar · Admin DinoBlack Games",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string; recuperar?: string }>;
}) {
  const { next, erro, recuperar } = await searchParams;
  const safeNext = next && next.startsWith("/admin") ? next : "/admin";

  if (recuperar) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-200">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
          <div className="mb-6 flex items-center gap-2">
            <span className="font-display text-2xl font-black text-white">Dino</span>
            <span className="rounded-md bg-dino-red px-1.5 py-0.5 text-[11px] font-black text-white">ADMIN</span>
          </div>
          <h1 className="mb-2 text-lg font-bold text-white">Recuperar senha</h1>
          <p className="mb-4 text-sm leading-relaxed text-zinc-400">
            Por enquanto o painel usa uma senha única da equipe. Para redefini-la, fale com o responsável técnico da loja.
          </p>
          <p className="mb-6 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs leading-relaxed text-zinc-400">
            A recuperação por e-mail chega junto com as contas individuais da equipe.
          </p>
          <Link
            href={`/admin-login?next=${encodeURIComponent(safeNext)}`}
            className="block w-full rounded-lg bg-dino-red py-2.5 text-center font-bold text-white transition hover:bg-dino-red-hover"
          >
            Voltar para entrar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-200">
      <form
        method="post"
        action="/api/admin/login"
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl"
      >
        <div className="mb-6 flex items-center gap-2">
          <span className="font-display text-2xl font-black text-white">Dino</span>
          <span className="rounded-md bg-dino-red px-1.5 py-0.5 text-[11px] font-black text-white">ADMIN</span>
        </div>
        <h1 className="mb-1 text-lg font-bold text-white">Entrar no painel</h1>
        <p className="mb-6 text-sm text-zinc-400">Acesso restrito à equipe da loja.</p>

        {erro && (
          <p role="alert" className="mb-4 rounded-lg border border-dino-red/40 bg-dino-red/10 px-3 py-2 text-sm text-red-300">
            Usuário ou senha incorretos.
          </p>
        )}

        <input type="hidden" name="next" value={safeNext} />

        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-semibold text-zinc-300">Usuário</span>
          <input
            name="user"
            defaultValue="admin"
            autoComplete="username"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-white outline-none focus:border-dino-red"
          />
        </label>
        <label className="mb-6 block">
          <span className="mb-1.5 flex items-center justify-between text-sm font-semibold text-zinc-300">
            Senha
            <Link
              href={`/admin-login?recuperar=1&next=${encodeURIComponent(safeNext)}`}
              className="text-xs font-semibold text-dino-red hover:underline"
            >
              Esqueci minha senha
            </Link>
          </span>
          <PasswordInput
            name="password"
            autoComplete="current-password"
            required
            autoFocus
            inputClassName="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-white outline-none focus:border-dino-red"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-dino-red py-2.5 font-bold text-white transition hover:bg-dino-red-hover"
        >
          Entrar
        </button>

        <Link href="/" className="mt-6 block text-center text-xs font-semibold text-zinc-500 hover:text-dino-red">
          ← Voltar à loja
        </Link>
      </form>
    </div>
  );
}
