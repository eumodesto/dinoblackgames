"use client";

import { useCallback, useEffect, useState } from "react";
import { PERMISSIONS, ROLE_HINT, ROLE_LABEL, type AdminRole, type Permission } from "@/lib/admin-permissions";
import { GooeyFilter, Toggle } from "@/components/ui/liquid-toggle";

type User = { id: string; email: string; name: string; role: AdminRole; permissions: Permission[]; isActive: boolean; mustChangePassword: boolean; lastLoginAt: string | null; createdAt: string };
type Mail = "sent" | "not_configured" | "disabled" | "failed" | null;
type Secret = { user: User; tempPassword: string; email: Mail; reason: "criado" | "redefinida" };

const card = "rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6";
const field = "mt-2 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-dino-red";
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Nunca entrou");
const MAIL_TEXT: Record<Exclude<Mail, null>, string> = {
  sent: "O convite foi enviado por e-mail.",
  not_configured: "O e-mail não foi enviado porque o Resend ainda não está configurado. Passe a senha abaixo ao usuário.",
  disabled: "O modelo “Convite para o painel” está desativado em Configurações → E-mails. Passe a senha abaixo ao usuário.",
  failed: "Não foi possível enviar o e-mail agora. Passe a senha abaixo ao usuário.",
};

function RolePicker({ role, onChange }: { role: AdminRole; onChange: (r: AdminRole) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-bold text-white">Perfil</legend>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {(["manager", "super_admin"] as const).map((r) => (
          <label key={r} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${role === r ? "border-dino-red/60 bg-dino-red/5" : "border-zinc-800 bg-zinc-950"}`}>
            <input type="radio" name="role" checked={role === r} onChange={() => onChange(r)} className="mt-1 h-4 w-4 accent-[#da2230]" />
            <span><span className="block font-bold text-white">{ROLE_LABEL[r]}</span><span className="block text-xs text-zinc-500">{ROLE_HINT[r]}</span></span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PermissionPicker({ role, value, onChange }: { role: AdminRole; value: Permission[]; onChange: (p: Permission[]) => void }) {
  const all = role === "super_admin";
  return (
    <fieldset>
      <legend className="text-sm font-bold text-white">Áreas liberadas</legend>
      {all && <p className="mt-1 text-xs text-zinc-500">O Super Admin acessa todas as áreas.</p>}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {PERMISSIONS.map((p) => {
          const on = all || value.includes(p.key);
          return (
            <label key={p.key} className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${all ? "opacity-60" : "cursor-pointer"} ${on ? "border-dino-red/40 bg-dino-red/5" : "border-zinc-800 bg-zinc-950"}`}>
              <input type="checkbox" checked={on} disabled={all} onChange={(e) => onChange(e.target.checked ? [...value, p.key] : value.filter((x) => x !== p.key))} className="mt-1 h-4 w-4 accent-[#da2230]" />
              <span><span className="block font-bold text-white">{p.label}</span><span className="block text-xs text-zinc-500">{p.hint}</span></span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function SecretBox({ secret, onClose }: { secret: Secret; onClose: () => void }) {
  return (
    <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <p className="text-sm font-bold text-amber-200">{secret.reason === "criado" ? `Usuário ${secret.user.name} cadastrado.` : `Nova senha provisória de ${secret.user.name}.`}</p>
      <p className="mt-1 text-xs text-amber-100/80">{secret.email ? MAIL_TEXT[secret.email] : ""} A senha aparece só agora; no primeiro acesso o usuário precisa trocá-la.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="rounded-lg border border-amber-500/40 bg-zinc-950 px-3 py-2 font-mono text-sm text-white">{secret.tempPassword}</code>
        <button type="button" onClick={() => void navigator.clipboard?.writeText(secret.tempPassword)} className="h-9 rounded-lg border border-amber-500/40 px-3 text-xs font-bold text-amber-100">Copiar</button>
        <button type="button" onClick={onClose} className="h-9 rounded-lg px-3 text-xs font-bold text-amber-100/80 hover:text-white">Fechar</button>
      </div>
      <p className="mt-2 text-xs text-amber-100/80">Usuário de acesso: <strong>{secret.user.email}</strong></p>
    </div>
  );
}

export default function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [ready, setReady] = useState(true);
  const [me, setMe] = useState<string | null>(null);
  const [sessionSecretSet, setSessionSecretSet] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [secret, setSecret] = useState<Secret | null>(null);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; role: AdminRole; permissions: Permission[] }>({ name: "", email: "", role: "manager", permissions: ["orders"] });
  const [busy, setBusy] = useState("");

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; role: AdminRole; permissions: Permission[] }>({ name: "", role: "manager", permissions: [] });

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Não foi possível carregar os usuários.");
    setUsers(body.users);
    setReady(body.ready);
    setMe(body.me);
    setSessionSecretSet(body.sessionSecretSet);
  }, []);

  useEffect(() => {
    load().catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [load]);

  async function send(url: string, method: string, body: unknown) {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Não foi possível concluir.");
    return data;
  }

  async function create() {
    setBusy("create");
    setMessage("");
    try {
      const data = await send("/api/admin/users", "POST", form);
      setSecret({ user: data.user, tempPassword: data.tempPassword, email: data.email, reason: "criado" });
      setForm({ name: "", email: "", role: "manager", permissions: ["orders"] });
      setCreating(false);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível cadastrar.");
    } finally {
      setBusy("");
    }
  }

  async function patch(user: User, body: Record<string, unknown>, label: string) {
    setBusy(`${label}:${user.id}`);
    setMessage("");
    try {
      const data = await send(`/api/admin/users/${user.id}`, "PATCH", body);
      if (data.tempPassword) setSecret({ user: data.user, tempPassword: data.tempPassword, email: data.email, reason: "redefinida" });
      else setMessage(`${data.user.name}: alteração salva${data.email === "sent" ? " e o usuário foi avisado por e-mail" : ""}.`);
      setEditing(null);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy("");
    }
  }

  function startEdit(u: User) {
    setEditing(editing === u.id ? null : u.id);
    setDraft({ name: u.name, role: u.role, permissions: u.permissions });
  }

  if (loading) return <div className={`${card} text-sm text-zinc-400`}>Carregando usuários…</div>;
  if (error) return <div className={`${card} text-sm text-red-300`}>{error}</div>;

  return (
    <div className="space-y-6">
      <GooeyFilter />
      {!ready && (
        <p role="alert" className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">O cadastro de usuários precisa de uma tabela que ainda não existe no banco. Aplique a migração <code>20261124000017_admin_users.sql</code> no Supabase e recarregue esta página.</p>
      )}
      {!sessionSecretSet && (
        <p role="alert" className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">Defina <code>ADMIN_PASSWORD</code> (ou <code>ADMIN_SESSION_SECRET</code>) no ambiente: é ela que assina as sessões. Sem isso, os usuários cadastrados não conseguem entrar.</p>
      )}

      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Equipe do painel</h2>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">Cadastre quem pode entrar no painel. O <strong>Super Admin</strong> acessa tudo, inclusive esta tela. O <strong>Gerente de Loja</strong> acessa só as áreas que você marcar. O convite sai por e-mail com uma senha provisória.</p>
          </div>
          <button type="button" onClick={() => { setCreating((v) => !v); setMessage(""); }} disabled={!ready} aria-expanded={creating} className="h-11 rounded-xl bg-dino-red px-5 text-sm font-bold text-white transition hover:bg-dino-red-hover disabled:opacity-50">{creating ? "Fechar" : "Novo usuário"}</button>
        </div>

        {secret && <div className="mt-5"><SecretBox secret={secret} onClose={() => setSecret(null)} /></div>}
        {message && <p role="status" className="mt-4 text-sm font-semibold text-zinc-300">{message}</p>}

        {creating && (
          <div className="mt-5 space-y-5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-zinc-300">Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="off" className={field} /></label>
              <label className="block text-sm text-zinc-300">E-mail (é o usuário de acesso)<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="off" className={field} /></label>
            </div>
            <RolePicker role={form.role} onChange={(role) => setForm({ ...form, role })} />
            <PermissionPicker role={form.role} value={form.permissions} onChange={(permissions) => setForm({ ...form, permissions })} />
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={create} disabled={busy === "create" || !form.name.trim() || !form.email.trim()} className="h-11 rounded-xl bg-dino-red px-5 text-sm font-bold text-white hover:bg-dino-red-hover disabled:opacity-50">{busy === "create" ? "Cadastrando…" : "Cadastrar e enviar convite"}</button>
              <span className="text-xs text-zinc-500">O e-mail de convite usa o modelo “Convite para o painel” (editável em Configurações → E-mails).</span>
            </div>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold text-white">Usuários cadastrados</h2>
        <p className="mt-1 text-xs text-zinc-500">O acesso principal (variáveis <code>ADMIN_USER</code> e <code>ADMIN_PASSWORD</code>) sempre existe e é Super Admin; não aparece nesta lista.</p>
        {users.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-zinc-700 p-6 text-sm text-zinc-500">Nenhum usuário cadastrado ainda.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {users.map((u) => {
              const self = u.id === me;
              const open = editing === u.id;
              return (
                <li key={u.id} className={`rounded-xl border bg-zinc-950 p-4 ${u.isActive ? "border-zinc-800" : "border-zinc-800/60 opacity-70"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-dino-red/15 text-sm font-black text-dino-red">{u.name.trim().charAt(0).toUpperCase()}</span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-bold text-white">{u.name}{self && <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-black uppercase text-zinc-300">Você</span>}
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${u.role === "super_admin" ? "border-purple-500/30 bg-purple-500/10 text-purple-300" : "border-sky-500/30 bg-sky-500/10 text-sky-300"}`}>{ROLE_LABEL[u.role]}</span>
                          {u.mustChangePassword && <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300">Senha provisória</span>}
                        </p>
                        <p className="break-all text-xs text-zinc-500">{u.email} · último acesso: {when(u.lastLoginAt)}</p>
                        <p className="mt-2 flex flex-wrap gap-1.5">
                          {u.role === "super_admin" ? <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-300">Todas as áreas</span> : u.permissions.map((p) => <span key={p} className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-300">{PERMISSIONS.find((x) => x.key === p)?.label ?? p}</span>)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Toggle size="sm" variant="success" checked={u.isActive} disabled={self || busy === `ativo:${u.id}`} onCheckedChange={(v) => void patch(u, { isActive: v }, "ativo")} label={`${u.isActive ? "Desativar" : "Ativar"} ${u.name}`} />
                        <span className="text-xs font-bold text-zinc-400">{u.isActive ? "Ativo" : "Desativado"}</span>
                      </div>
                      <button type="button" onClick={() => startEdit(u)} aria-expanded={open} className="h-9 rounded-lg border border-zinc-700 px-3 text-xs font-bold text-zinc-200 hover:border-dino-red">{open ? "Fechar" : "Editar"}</button>
                      <button type="button" onClick={() => { if (window.confirm(`Gerar uma nova senha provisória para ${u.name}? A senha atual deixa de valer e as sessões abertas caem.`)) void patch(u, { resetPassword: true }, "senha"); }} disabled={busy === `senha:${u.id}`} className="h-9 rounded-lg border border-zinc-700 px-3 text-xs font-bold text-zinc-200 hover:border-dino-red disabled:opacity-50">{busy === `senha:${u.id}` ? "Gerando…" : "Redefinir senha"}</button>
                    </div>
                  </div>

                  {open && (
                    <div className="mt-4 space-y-5 border-t border-zinc-800 pt-4">
                      <label className="block max-w-md text-sm text-zinc-300">Nome<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={field} /></label>
                      {self ? <p className="text-xs text-zinc-500">Você não pode mudar o próprio perfil nem as próprias áreas: peça a outro Super Admin.</p> : (
                        <>
                          <RolePicker role={draft.role} onChange={(role) => setDraft({ ...draft, role })} />
                          <PermissionPicker role={draft.role} value={draft.permissions} onChange={(permissions) => setDraft({ ...draft, permissions })} />
                        </>
                      )}
                      <button type="button" onClick={() => void patch(u, self ? { name: draft.name } : draft, "salvar")} disabled={busy === `salvar:${u.id}`} className="h-10 rounded-xl bg-dino-red px-5 text-sm font-bold text-white hover:bg-dino-red-hover disabled:opacity-50">{busy === `salvar:${u.id}` ? "Salvando…" : "Salvar alterações"}</button>
                      <p className="text-xs text-zinc-500">Mudar perfil ou áreas derruba as sessões abertas do usuário e envia a ele o aviso “Permissões alteradas”.</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
