import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, accessOf, readSession, type AdminSession } from "@/lib/admin-auth";
import { PERMISSIONS, ROLE_LABEL, isPermission, type Access, type AdminRole, type Permission } from "@/lib/admin-permissions";
import { sendTransactionalEmail } from "./email";
import { hashPassword, temporaryPassword, verifyPassword } from "./passwords";
import { getSql } from "./sql";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: Permission[];
  isActive: boolean;
  mustChangePassword: boolean;
  sessionVersion: number;
  lastLoginAt: string | null;
  createdAt: string;
};

type Row = {
  id: string; email: string; name: string; role: AdminRole; permissions: string[] | null; is_active: boolean;
  must_change_password: boolean; session_version: number; last_login_at: string | Date | null; created_at: string | Date;
};
const COLUMNS = "id, email, name, role, permissions, is_active, must_change_password, session_version, last_login_at, created_at";

const toUser = (r: Row): AdminUser => ({
  id: r.id, email: r.email, name: r.name, role: r.role,
  permissions: (r.permissions ?? []).filter(isPermission),
  isActive: r.is_active, mustChangePassword: r.must_change_password, sessionVersion: r.session_version,
  lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null,
  createdAt: new Date(r.created_at).toISOString(),
});

export class UsersError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "UsersError";
  }
}

const g = globalThis as unknown as { __dinoUsersReady?: { at: number; value: boolean }; __dinoStaffCache?: Map<string, { at: number; user: AdminUser | null }> };

/** A tabela admin_users existe (migration 20261124000017)? Antes dela, só o acesso principal funciona. */
export async function usersTableReady(): Promise<boolean> {
  const c = g.__dinoUsersReady;
  if (c && (c.value || Date.now() - c.at < 60_000)) return c.value;
  let value = false;
  try {
    await (await getSql()).query("select 1 as ok from admin_users limit 1");
    value = true;
  } catch {
    value = false;
  }
  g.__dinoUsersReady = { at: Date.now(), value };
  return value;
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const rows = await (await getSql()).query<Row>(`select ${COLUMNS} from admin_users order by is_active desc, lower(name)`);
  return rows.map(toUser);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function cleanPermissions(role: AdminRole, input: unknown): Permission[] {
  if (role === "super_admin") return [];
  const list = Array.isArray(input) ? input.filter(isPermission) : [];
  const unique = [...new Set(list)];
  if (unique.length === 0) throw new UsersError("Marque pelo menos uma área para o Gerente de Loja.");
  return unique;
}

const permissionsText = (role: AdminRole, perms: Permission[]) =>
  role === "super_admin" ? "Todas as áreas" : PERMISSIONS.filter((p) => perms.includes(p.key)).map((p) => p.label).join(", ");

async function mail(template: "staff_invited" | "staff_access_changed", user: AdminUser, tempPassword?: string): Promise<"sent" | "not_configured" | "disabled" | "failed"> {
  try {
    const r = await sendTransactionalEmail({
      to: user.email,
      template,
      variables: { name: user.name, role: ROLE_LABEL[user.role], staff_email: user.email, temp_password: tempPassword ?? "", permissions: permissionsText(user.role, user.permissions) },
    });
    return r.sent ? "sent" : r.reason === "disabled" ? "disabled" : "not_configured";
  } catch (e) {
    console.error("[usuarios] e-mail não enviado:", e instanceof Error ? e.message : e);
    return "failed";
  }
}

export async function createAdminUser(input: Record<string, unknown>, createdBy: string) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const role = input.role as AdminRole;
  if (name.length < 2 || name.length > 120) throw new UsersError("Informe o nome (2 a 120 letras).");
  if (!EMAIL.test(email)) throw new UsersError("Informe um e-mail válido.");
  if (role !== "super_admin" && role !== "manager") throw new UsersError("Escolha o perfil do usuário.");
  const permissions = cleanPermissions(role, input.permissions);
  const sql = await getSql();
  if ((await sql.query("select 1 as ok from admin_users where lower(email) = $1", [email])).length > 0) throw new UsersError("Já existe um usuário com este e-mail.", 409);
  const tempPassword = temporaryPassword();
  const [row] = await sql.query<Row>(
    `insert into admin_users (email, name, role, permissions, password_hash, must_change_password, created_by)
     values ($1, $2, $3, $4::text[], $5, true, $6) returning ${COLUMNS}`,
    [email, name, role, `{${permissions.join(",")}}`, await hashPassword(tempPassword), createdBy],
  );
  const user = toUser(row);
  return { user, tempPassword, email: await mail("staff_invited", user, tempPassword) };
}

export type UserPatch = { name?: unknown; role?: unknown; permissions?: unknown; isActive?: unknown; resetPassword?: unknown };

/** Atualiza perfil, permissões, ativação ou redefine a senha. Qualquer mudança que afete o acesso derruba as sessões abertas do usuário. */
export async function updateAdminUser(id: string, patch: UserPatch, actorUid: string | null) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new UsersError("Usuário inválido.", 404);
  const sql = await getSql();
  const [current] = await sql.query<Row>(`select ${COLUMNS} from admin_users where id = $1::uuid`, [id]);
  if (!current) throw new UsersError("Usuário não encontrado.", 404);
  const before = toUser(current);
  const isSelf = actorUid === id;

  const name = typeof patch.name === "string" ? patch.name.trim() : before.name;
  if (name.length < 2 || name.length > 120) throw new UsersError("Informe o nome (2 a 120 letras).");
  const role = patch.role === undefined ? before.role : (patch.role as AdminRole);
  if (role !== "super_admin" && role !== "manager") throw new UsersError("Perfil inválido.");
  const permissions = role === "super_admin" ? [] : cleanPermissions(role, patch.permissions === undefined ? before.permissions : patch.permissions);
  const isActive = typeof patch.isActive === "boolean" ? patch.isActive : before.isActive;
  if (isSelf && (role !== before.role || !isActive)) throw new UsersError("Você não pode mudar o próprio perfil nem se desativar. Peça a outro Super Admin.", 409);

  const accessChanged = role !== before.role || isActive !== before.isActive || JSON.stringify([...permissions].sort()) !== JSON.stringify([...before.permissions].sort());
  const reset = patch.resetPassword === true;
  const tempPassword = reset ? temporaryPassword() : undefined;
  const [row] = await sql.query<Row>(
    `update admin_users set name = $2, role = $3, permissions = $4::text[], is_active = $5,
       session_version = session_version + $6::int,
       password_hash = coalesce($7, password_hash), must_change_password = must_change_password or $8::boolean
     where id = $1::uuid returning ${COLUMNS}`,
    [id, name, role, `{${permissions.join(",")}}`, isActive, accessChanged || reset ? 1 : 0, tempPassword ? await hashPassword(tempPassword) : null, reset],
  );
  g.__dinoStaffCache?.delete(id);
  const user = toUser(row);
  let email: "sent" | "not_configured" | "disabled" | "failed" | null = null;
  if (reset) email = await mail("staff_invited", user, tempPassword);
  else if (accessChanged && isActive) email = await mail("staff_access_changed", user);
  return { user, tempPassword, email };
}

/** Confere e-mail e senha. Gasta o mesmo tempo quando o e-mail não existe, para não revelar quais e-mails estão cadastrados. */
const DUMMY_HASH = "scrypt$16384$00000000000000000000000000000000$" + "0".repeat(128);
export async function authenticateStaff(email: string, password: string): Promise<AdminUser | null> {
  const clean = email.trim().toLowerCase();
  if (!EMAIL.test(clean) || !(await usersTableReady())) return null;
  const [row] = await (await getSql()).query<Row & { password_hash: string }>(`select ${COLUMNS}, password_hash from admin_users where lower(email) = $1`, [clean]);
  const ok = await verifyPassword(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !ok || !row.is_active) return null;
  await (await getSql()).query("update admin_users set last_login_at = now() where id = $1::uuid", [row.id]).catch(() => undefined);
  return toUser(row);
}

export async function changeOwnPassword(id: string, current: string, next: string): Promise<AdminUser> {
  const sql = await getSql();
  const [row] = await sql.query<Row & { password_hash: string }>(`select ${COLUMNS}, password_hash from admin_users where id = $1::uuid and is_active`, [id]);
  if (!row || !(await verifyPassword(current, row.password_hash))) throw new UsersError("A senha atual não confere.", 403);
  const [updated] = await sql.query<Row>(
    `update admin_users set password_hash = $2, must_change_password = false, session_version = session_version + 1 where id = $1::uuid returning ${COLUMNS}`,
    [id, await hashPassword(next)],
  );
  g.__dinoStaffCache?.delete(id);
  return toUser(updated);
}

/** O usuário da sessão continua ativo e com a mesma versão de cadastro? (cache de 15 s) */
async function freshStaff(uid: string, sv: number): Promise<AdminUser | null> {
  const cache = (g.__dinoStaffCache ??= new Map());
  const hit = cache.get(uid);
  let user: AdminUser | null;
  if (hit && Date.now() - hit.at < 15_000) user = hit.user;
  else {
    try {
      const [row] = await (await getSql()).query<Row>(`select ${COLUMNS} from admin_users where id = $1::uuid`, [uid]);
      user = row ? toUser(row) : null;
    } catch {
      user = null;
    }
    cache.set(uid, { at: Date.now(), user });
  }
  return user && user.isActive && user.sessionVersion === sv ? user : null;
}

export type CurrentAdmin = {
  session: AdminSession;
  access: Access;
  name: string;
  email: string | null;
  role: AdminRole | null;
  uid: string | null;
  mustChangePassword: boolean;
};

/** Quem está logado agora, já conferido no banco (usuário ativo e sessão não derrubada). `null` = sem acesso. */
export async function currentAdmin(): Promise<CurrentAdmin | null> {
  const session = await readSession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!session) return null;
  if (session.kind === "root") return { session, access: "all", name: "Acesso principal", email: null, role: "super_admin", uid: null, mustChangePassword: false };
  const user = await freshStaff(session.uid, session.sv);
  if (!user) return null;
  const fresh: AdminSession = { kind: "staff", uid: user.id, role: user.role, perms: user.permissions, name: user.name, sv: user.sessionVersion, mc: user.mustChangePassword, exp: session.exp };
  return { session: fresh, access: accessOf(fresh), name: user.name, email: user.email, role: user.role, uid: user.id, mustChangePassword: user.mustChangePassword };
}
