"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { PasswordInput } from "@/components/ui/PasswordInput";

// Tela de entrada, cadastro e recuperação de senha do cliente.
// Ainda sem backend: as contas de cliente dependem do Supabase Auth, que não
// está ligado. Os formulários validam o preenchimento e avisam que o acesso
// chega em breve, sem fingir que a conta foi criada.

type Tab = "entrar" | "criar" | "recuperar";

const inputClass =
  "h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-dino-red focus:ring-2 focus:ring-dino-red/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";
const eyeClass = "text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-white";
const buttonClass =
  "h-12 w-full rounded-xl bg-dino-red font-bold text-white transition hover:bg-dino-red-hover disabled:opacity-60";

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-zinc-300">
        {label}
        {hint}
      </span>
      {children}
    </label>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
      {children}
    </p>
  );
}

const SOON =
  "As contas de cliente estão sendo ativadas e ainda não funcionam. Enquanto isso, você pode comprar normalmente como visitante.";

export function AccountAccess() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("aba");
  const tab: Tab = raw === "criar" || raw === "recuperar" ? raw : "entrar";
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function go(next: Tab) {
    setNotice(null);
    setError(null);
    router.replace(next === "entrar" ? "/minhaconta" : `/minhaconta?aba=${next}`, { scroll: false });
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    if (tab === "criar") {
      const pass = String(data.get("password") ?? "");
      if (pass.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
      if (pass !== String(data.get("confirm") ?? "")) return setError("As senhas não conferem.");
    }
    setNotice(
      tab === "recuperar"
        ? "A recuperação de senha por e-mail ainda não está ativa. Ela chega junto com as contas de cliente."
        : SOON,
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="mb-1 font-display text-3xl font-black text-gray-900 dark:text-white">
        {tab === "recuperar" ? "Recuperar senha" : "Minha conta"}
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-zinc-400">
        {tab === "recuperar"
          ? "Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
          : "Entre para acompanhar seus pedidos e comprar mais rápido."}
      </p>

      <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-7">
        {tab !== "recuperar" && (
          <div role="tablist" aria-label="Acesso à conta" className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-zinc-900">
            {(
              [
                ["entrar", "Entrar"],
                ["criar", "Criar conta"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => go(id)}
                className={`h-10 rounded-lg text-sm font-bold transition ${
                  tab === id
                    ? "bg-white text-gray-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                    : "text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <form key={tab} onSubmit={submit} className="space-y-4">
          {tab === "criar" && (
            <Field label="Nome completo">
              <input name="name" required autoComplete="name" className={inputClass} placeholder="Como devemos te chamar" />
            </Field>
          )}

          <Field label="E-mail">
            <input name="email" type="email" required autoComplete="email" className={inputClass} placeholder="voce@email.com" />
          </Field>

          {tab === "criar" && (
            <Field label="Celular (WhatsApp)">
              <input name="phone" type="tel" required autoComplete="tel" inputMode="tel" className={inputClass} placeholder="(61) 90000-0000" />
            </Field>
          )}

          {tab === "entrar" && (
            <Field
              label="Senha"
              hint={
                <button type="button" onClick={() => go("recuperar")} className="text-xs font-semibold text-dino-red hover:underline">
                  Esqueci minha senha
                </button>
              }
            >
              <PasswordInput name="password" required autoComplete="current-password" inputClassName={inputClass} buttonClassName={eyeClass} />
            </Field>
          )}

          {tab === "criar" && (
            <>
              <Field label="Senha">
                <PasswordInput name="password" required minLength={8} autoComplete="new-password" inputClassName={inputClass} buttonClassName={eyeClass} placeholder="Mínimo de 8 caracteres" />
              </Field>
              <Field label="Confirmar senha">
                <PasswordInput name="confirm" required autoComplete="new-password" inputClassName={inputClass} buttonClassName={eyeClass} />
              </Field>
              <label className="flex items-start gap-3 text-sm text-gray-600 dark:text-zinc-400">
                <input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 accent-[var(--dino-red)]" />
                <span>Li e aceito os termos de uso e a política de privacidade.</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-gray-600 dark:text-zinc-400">
                <input type="checkbox" name="marketing" className="mt-0.5 h-4 w-4 accent-[var(--dino-red)]" />
                <span>Quero receber ofertas e novidades por e-mail e WhatsApp.</span>
              </label>
            </>
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-dino-red/40 bg-dino-red/10 p-3 text-sm font-semibold text-dino-red">
              {error}
            </p>
          )}
          {notice && <Notice>{notice}</Notice>}

          <button type="submit" className={buttonClass}>
            {tab === "entrar" ? "Entrar" : tab === "criar" ? "Criar conta" : "Enviar link de recuperação"}
          </button>
        </form>

        {tab === "recuperar" && (
          <button type="button" onClick={() => go("entrar")} className="mt-5 w-full text-center text-sm font-semibold text-gray-500 hover:text-dino-red dark:text-zinc-400">
            ← Voltar para entrar
          </button>
        )}
      </div>
    </div>
  );
}
