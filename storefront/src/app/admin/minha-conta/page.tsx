import ChangePasswordForm from "@/components/admin/ChangePasswordForm";
import { ROLE_LABEL } from "@/lib/admin-permissions";
import { currentAdmin } from "@/lib/server/admin-users";

export const dynamic = "force-dynamic";

export default async function MyAccountPage() {
  const admin = await currentAdmin();
  if (!admin) return null;
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-dino-red">Administração</p>
        <h1 className="mt-2 font-display text-3xl font-black text-white">Minha conta</h1>
        <p className="mt-2 text-sm text-zinc-500">{admin.name}{admin.email ? ` · ${admin.email}` : ""}{admin.role ? ` · ${ROLE_LABEL[admin.role]}` : ""}</p>
      </div>

      {admin.mustChangePassword && (
        <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-semibold text-amber-200">Você entrou com uma senha provisória. Escolha uma senha nova para liberar o painel.</p>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h2 className="text-lg font-bold text-white">Trocar senha</h2>
        {admin.uid ? (
          <div className="mt-4"><ChangePasswordForm forced={admin.mustChangePassword} /></div>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">Este é o acesso principal. A senha dele fica na variável <code>ADMIN_PASSWORD</code> da Vercel.</p>
        )}
      </section>
    </div>
  );
}
