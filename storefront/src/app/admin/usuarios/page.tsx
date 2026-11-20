import { BackLink } from "@/components/admin/BackLink";
import UsersManager from "@/components/admin/UsersManager";

export const dynamic = "force-dynamic";

export default function UsersPage() {
  return (
    <div className="max-w-5xl space-y-8">
      <BackLink href="/admin">Voltar para o painel</BackLink>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-dino-red">Administração</p>
        <h1 className="mt-2 font-display text-3xl font-black text-white">Usuários</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-500">Quem pode entrar no painel e o que cada pessoa pode fazer. Só Super Admin vê esta página.</p>
      </div>
      <UsersManager />
    </div>
  );
}
