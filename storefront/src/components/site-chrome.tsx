"use client";

import { usePathname } from "next/navigation";

// O painel (/admin) e o login (/admin-login) têm layout próprio, sem o
// cabeçalho e o rodapé da loja.
export function SiteChrome({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/admin")) {
    return <main className="min-h-screen w-full">{children}</main>;
  }
  return (
    <div className="flex min-h-screen flex-col">
      {header}
      <main className="w-full flex-grow pb-16 transition-colors duration-300 lg:pb-0">{children}</main>
      {footer}
    </div>
  );
}
