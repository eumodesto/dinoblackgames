import "@fontsource-variable/manrope";
import "@/app/admin/admin-glass.css";

// Mesmo design system do admin (tokens e remapeamento de utilidades), em tema escuro fixo.
export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return <div className="gd-app" data-theme="dark">{children}</div>;
}
