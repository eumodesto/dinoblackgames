/** Perfis e permissões do painel. Sem dependências de servidor: o menu, o middleware e as telas usam o mesmo arquivo. */
export const ROLES = ["super_admin", "manager"] as const;
export type AdminRole = (typeof ROLES)[number];
export const ROLE_LABEL: Record<AdminRole, string> = { super_admin: "Super Admin", manager: "Gerente de Loja" };
export const ROLE_HINT: Record<AdminRole, string> = {
  super_admin: "Acesso geral: todas as áreas, integrações e o cadastro de usuários.",
  manager: "Acessa só as áreas marcadas abaixo. Não gerencia usuários.",
};

export const PERMISSIONS = [
  { key: "orders", label: "Pedidos", hint: "Ver pedidos, mudar status, envios, trocas e estornos" },
  { key: "products", label: "Produtos e estoque", hint: "Cadastrar, editar, publicar produtos e tags" },
  { key: "categories", label: "Categorias", hint: "Organizar o catálogo e a navegação" },
  { key: "coupons", label: "Cupons", hint: "Criar e editar cupons de desconto" },
  { key: "settings", label: "Configurações e integrações", hint: "Mercado Pago, e-mails, webhooks, analytics" },
] as const;
export type Permission = (typeof PERMISSIONS)[number]["key"];
export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key) as Permission[];
export const isPermission = (v: unknown): v is Permission => typeof v === "string" && (PERMISSION_KEYS as string[]).includes(v);
export const isRole = (v: unknown): v is AdminRole => typeof v === "string" && (ROLES as readonly string[]).includes(v);

/** O que o usuário logado pode ver: "all" (raiz e Super Admin) ou a lista do gerente. */
export type Access = "all" | Permission[];

/** Qual permissão cada rota exige. `null` = qualquer usuário do painel; "users" = só Super Admin. */
export function requiredPermission(pathname: string): Permission | "users" | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  const rules: [RegExp, Permission | "users"][] = [
    [/^\/(api\/)?admin\/usuarios(\/|$)/, "users"],
    [/^\/api\/admin\/users(\/|$)/, "users"],
    [/^\/admin\/pedidos(\/|$)/, "orders"],
    [/^\/api\/admin\/orders(\/|$)/, "orders"],
    [/^\/admin\/(produtos|estoque|tags)(\/|$)/, "products"],
    [/^\/api\/admin\/(products|tags|uploads)(\/|$)/, "products"],
    [/^\/admin\/categorias(\/|$)/, "categories"],
    [/^\/api\/admin\/categories(\/|$)/, "categories"],
    [/^\/admin\/cupons(\/|$)/, "coupons"],
    [/^\/api\/admin\/coupons(\/|$)/, "coupons"],
    [/^\/admin\/(configuracoes|design-system)(\/|$)/, "settings"],
    [/^\/api\/admin\/(email|webhooks|mercadopago|tracking)(\/|$)/, "settings"],
  ];
  return rules.find(([re]) => re.test(p))?.[1] ?? null;
}

export function canAccess(access: Access, pathname: string): boolean {
  const need = requiredPermission(pathname);
  if (need === null || access === "all") return need !== "users" || access === "all";
  return need !== "users" && access.includes(need);
}
