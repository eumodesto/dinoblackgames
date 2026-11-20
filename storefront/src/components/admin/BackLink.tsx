import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Atalho para voltar à listagem (usado no topo das páginas de detalhe/edição do admin). */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="gd-back">
      <ArrowLeft aria-hidden="true" />
      {children}
    </Link>
  );
}
