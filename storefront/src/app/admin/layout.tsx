import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { currentAdmin } from "@/lib/server/admin-users";

export const metadata: Metadata = {
  title: "Admin · DinoBlack Games",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // O middleware confere a assinatura do cookie; aqui confere no banco se o usuário continua ativo e com o mesmo cadastro.
  const admin = await currentAdmin();
  if (!admin) redirect("/admin-login");
  return (
    <AdminShell access={admin.access} me={{ name: admin.name, staff: admin.uid !== null }}>
      {children}
    </AdminShell>
  );
}
