"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordInput } from "@/components/ui/PasswordInput";

type Tab = "entrar" | "criar" | "recuperar";
const inputClass = "h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-dino-red focus:ring-2 focus:ring-dino-red/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";
const eyeClass = "text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-white";
const buttonClass = "h-12 w-full rounded-xl bg-dino-red font-bold text-white transition hover:bg-dino-red-hover disabled:opacity-60";

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-zinc-300">{label}{hint}</span>{children}</label>;
}

export function AccountAccess() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("aba");
  const tab: Tab = raw === "criar" || raw === "recuperar" ? raw : "entrar";
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);

  useEffect(() => { fetch("/api/account/me").then((r) => r.json()).then((d) => setUser(d.user)).catch(() => undefined); }, []);
  const go = (next: Tab) => { setNotice(""); setError(""); router.replace(next === "entrar" ? "/minhaconta" : `/minhaconta?aba=${next}`, { scroll: false }); };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setNotice(""); setError("");
    const data = new FormData(e.currentTarget);
    const payload = Object.fromEntries(data.entries());
    if (tab === "criar" && payload.password !== payload.confirm) { setBusy(false); setError("As senhas não conferem."); return; }
    try {
      const endpoint = tab === "criar" ? "/api/account/signup" : tab === "recuperar" ? "/api/account/recover" : "/api/account/login";
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, marketing: data.get("marketing") === "on" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível concluir.");
      if (tab === "entrar") { setUser(result.user); setNotice("Login realizado. Sua conta está pronta."); }
      else if (tab === "criar") { setNotice(result.needsConfirmation ? "Conta criada. Confira seu e-mail para confirmar o cadastro." : "Conta criada com sucesso."); if (!result.needsConfirmation) setUser({ email: String(payload.email), name: String(payload.name) }); }
      else setNotice("Se o e-mail estiver cadastrado, enviaremos o link de recuperação.");
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível concluir."); } finally { setBusy(false); }
  }

  async function logout() { await fetch("/api/account/logout", { method: "POST" }); setUser(null); setNotice("Você saiu da conta."); }

  if (user) return <div className="mx-auto w-full max-w-md"><h1 className="mb-1 font-display text-3xl font-black text-gray-900 dark:text-white">Minha conta</h1><p className="mb-6 text-sm text-gray-500 dark:text-zinc-400">Olá, {user.name || user.email}.</p><div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"><p className="text-sm text-gray-600 dark:text-zinc-300">E-mail: <strong>{user.email}</strong></p><div className="mt-6 grid gap-3"><button className="h-11 rounded-xl border border-gray-200 text-sm font-bold dark:border-zinc-700">Meus pedidos</button><button className="h-11 rounded-xl border border-gray-200 text-sm font-bold dark:border-zinc-700">Endereços</button><button onClick={logout} className="h-11 rounded-xl bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-800">Sair</button></div>{notice && <p role="status" className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}</div></div>;

  return <div className="mx-auto w-full max-w-md"><h1 className="mb-1 font-display text-3xl font-black text-gray-900 dark:text-white">{tab === "recuperar" ? "Recuperar senha" : "Minha conta"}</h1><p className="mb-6 text-sm text-gray-500 dark:text-zinc-400">{tab === "recuperar" ? "Informe seu e-mail para receber o link de recuperação." : "Entre ou crie sua conta para acompanhar pedidos e comprar mais rápido."}</p><div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-7">{tab !== "recuperar" && <div role="tablist" className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-zinc-900">{([["entrar", "Entrar"], ["criar", "Criar conta"]] as const).map(([id, title]) => <button key={id} type="button" onClick={() => go(id)} className={`h-10 rounded-lg text-sm font-bold ${tab === id ? "bg-white text-gray-900 shadow-sm dark:bg-zinc-800 dark:text-white" : "text-gray-500"}`}>{title}</button>)}</div>}<form key={tab} onSubmit={submit} className="space-y-4">{tab === "criar" && <Field label="Nome completo"><input name="name" required autoComplete="name" className={inputClass} placeholder="Como devemos te chamar" /></Field>}<Field label="E-mail"><input name="email" type="email" required autoComplete="email" className={inputClass} placeholder="voce@email.com" /></Field>{tab === "criar" && <Field label="Celular (WhatsApp)"><input name="phone" type="tel" required autoComplete="tel" className={inputClass} placeholder="(61) 90000-0000" /></Field>}{tab !== "recuperar" && <Field label="Senha" hint={tab === "entrar" && <button type="button" onClick={() => go("recuperar")} className="text-xs font-semibold text-dino-red">Esqueci minha senha</button>}><PasswordInput name="password" required minLength={8} autoComplete={tab === "entrar" ? "current-password" : "new-password"} inputClassName={inputClass} buttonClassName={eyeClass} /></Field>}{tab === "criar" && <><Field label="Confirmar senha"><PasswordInput name="confirm" required autoComplete="new-password" inputClassName={inputClass} buttonClassName={eyeClass} /></Field><label className="flex items-start gap-3 text-sm text-gray-600 dark:text-zinc-400"><input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 accent-[var(--dino-red)]" /><span>Li e aceito os termos de uso e a política de privacidade.</span></label><label className="flex items-start gap-3 text-sm text-gray-600 dark:text-zinc-400"><input type="checkbox" name="marketing" className="mt-0.5 h-4 w-4 accent-[var(--dino-red)]" /><span>Quero receber ofertas e novidades.</span></label></>}{error && <p role="alert" className="rounded-xl border border-dino-red/40 bg-dino-red/10 p-3 text-sm font-semibold text-dino-red">{error}</p>}{notice && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}<button disabled={busy} type="submit" className={buttonClass}>{busy ? "Aguarde..." : tab === "entrar" ? "Entrar" : tab === "criar" ? "Criar conta" : "Enviar link de recuperação"}</button></form>{tab === "recuperar" && <button type="button" onClick={() => go("entrar")} className="mt-5 w-full text-center text-sm font-semibold text-gray-500 hover:text-dino-red">← Voltar para entrar</button>}</div></div>;
}
