"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Box, ChevronRight, LayoutDashboard, LogOut, Moon, Search, Settings, ShoppingBag, Store, Sun, Tag, Ticket, X } from "lucide-react";
import "@fontsource-variable/manrope";
import "@/app/admin/admin-glass.css";
import { GROUPS } from "./AdminSidebar";

// Atalhos principais do dock. O menu completo (todas as seções) abre pela busca da barra superior.
const DOCK = [
  { href: "/admin", label: "Dashboard", short: "Início", icon: LayoutDashboard },
  { href: "/admin/pedidos", label: "Pedidos", short: "Pedidos", icon: ShoppingBag },
  { href: "/admin/produtos", label: "Produtos", short: "Produtos", icon: Box },
  { href: "/admin/categorias", label: "Categorias", short: "Categ.", icon: Tag },
  { href: "/admin/cupons", label: "Cupons", short: "Cupons", icon: Ticket },
  { href: "/admin/configuracoes", label: "Configurações", short: "Config.", icon: Settings },
] as const;

const STORAGE_KEY = "dino-admin-theme";

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

// Barra lateral de ícones (desktop): atalhos principais, com dica ao passar o mouse.
function SideDock({ pathname }: { pathname: string }) {
  return (
    <nav className="gd-dock gd-dock-side" aria-label="Atalhos do admin">
      {DOCK.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} aria-label={label} aria-current={isActive(pathname, href) ? "page" : undefined}>
          <Icon aria-hidden="true" />
          <span className="gd-dock-tip" aria-hidden="true">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

// Dock inferior: no celular desliza com o dedo; no desktop também rola com a roda do mouse e arrasta com o mouse.
function Dock({ pathname }: { pathname: string }) {
  const nav = useRef<HTMLElement>(null);
  const drag = useRef({ active: false, moved: false, startX: 0, startScroll: 0 });

  useEffect(() => {
    const el = nav.current;
    if (!el) return;
    // Roda do mouse (vertical) vira rolagem horizontal quando o dock tem o que rolar.
    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Mantém o item atual visível ao trocar de página.
  useEffect(() => {
    nav.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  function onPointerDown(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || !nav.current) return;
    drag.current = { active: true, moved: false, startX: event.clientX, startScroll: nav.current.scrollLeft };
  }
  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    const state = drag.current;
    if (!state.active || !nav.current) return;
    const dx = event.clientX - state.startX;
    if (!state.moved && Math.abs(dx) > 5) {
      state.moved = true;
      nav.current.setPointerCapture(event.pointerId);
      nav.current.dataset.dragging = "true";
    }
    if (state.moved) nav.current.scrollLeft = state.startScroll - dx;
  }
  function endDrag(event: React.PointerEvent<HTMLElement>) {
    const el = nav.current;
    if (el && drag.current.moved) {
      el.releasePointerCapture?.(event.pointerId);
      delete el.dataset.dragging;
    }
    drag.current.active = false;
  }

  return (
    <nav ref={nav} className="gd-dock gd-dock-bottom" aria-label="Navegação do admin"
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
      // Depois de arrastar, o clique que o navegador gera ao soltar não deve abrir um link.
      onClickCapture={(event) => { if (drag.current.moved) { event.preventDefault(); event.stopPropagation(); drag.current.moved = false; } }}>
      {DOCK.map(({ href, label, short, icon: Icon }) => (
        <Link key={href} href={href} aria-label={label} draggable={false} aria-current={isActive(pathname, href) ? "page" : undefined}>
          <Icon aria-hidden="true" />
          <span className="gd-dock-text" aria-hidden="true">{label}</span>
          <span className="gd-dock-short" aria-hidden="true">{short}</span>
        </Link>
      ))}
    </nav>
  );
}

type Anchor = { top: number; left: number; width: number };

// Abre o menu "Ir para" logo abaixo da barra de busca (mesma largura), como um menu suspenso.
function QuickNav({ close, anchor }: { close: () => void; anchor: () => Anchor }) {
  const ref = useRef<HTMLDialogElement>(null);
  const label = useId();
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<Anchor>(anchor);
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

  useEffect(() => {
    ref.current?.showModal();
    ref.current?.querySelector("input")?.focus();
    const reposition = () => setPos(anchor());
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [anchor]);

  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => terms.every((term) => `${group.label} ${item.label}`.toLowerCase().includes(term))),
  })).filter((group) => group.items.length > 0);

  return (
    <dialog className="gd-dialog gd-dialog-drop" ref={ref} aria-labelledby={label} onClose={close}
      style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: `calc(100svh - ${pos.top}px - 16px)` }}
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <section className="gd-dialog-inner">
        <header>
          <h2 id={label}>Ir para</h2>
          <button type="button" className="gd-icon-button" aria-label="Fechar" onClick={() => ref.current?.close()}><X aria-hidden="true" /></button>
        </header>
        <label className="gd-search"><Search aria-hidden="true" />
          <input type="search" aria-label="Buscar seção do admin" placeholder="Buscar pedidos, produtos, integrações…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="gd-quick-list">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="gd-dialog-group">{group.label}</p>
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => ref.current?.close()}>
                  <div style={{ flex: 1 }}><strong>{item.label}</strong></div><ChevronRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          ))}
          {groups.length === 0 && <p className="gd-empty" role="status">Nenhuma seção encontrada.</p>}
        </div>
      </section>
    </dialog>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [search, setSearch] = useState(false);
  const askRef = useRef<HTMLButtonElement>(null);
  const searchAnchor = useCallback((): Anchor => {
    const rect = askRef.current?.getBoundingClientRect();
    if (!rect) return { top: 80, left: 16, width: 400 };
    const width = Math.min(Math.max(rect.width, 360), window.innerWidth - 24);
    return { top: rect.bottom + 8, left: Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12)), width };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") setTheme(saved);
      else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
    } catch { /* sem armazenamento: usa o tema padrão */ }
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignora */ }
  }

  const current = [...DOCK].reverse().find((item) => isActive(pathname, item.href));
  const themeLabel = theme === "light" ? "Usar tema escuro" : "Usar tema claro";

  return (
    <div className="gd-app" data-theme={theme}>
      <div className="gd-surround">
        <header className="gd-top">
          <Link href="/admin" className="gd-brand" aria-label="DinoBlack Games — painel administrativo">
            <Image src="/brand/logo.png" alt="" width={92} height={46} priority className="gd-logo-img" />
            <div className="gd-brand-text"><strong>Painel</strong><small>Administrativo</small></div>
          </Link>
          <button type="button" ref={askRef} className="gd-ask" aria-label="Buscar seção do admin" onClick={() => setSearch(true)}>
            <span className="gd-orb" aria-hidden="true" />
            <span className="gd-prompt">{current ? `${current.label} · ir para…` : "Ir para uma seção…"}</span>
            <Search aria-hidden="true" className="gd-ask-search" />
          </button>
          <div className="gd-top-actions">
            <button type="button" className="gd-icon-button" title={themeLabel} aria-label={themeLabel} onClick={toggleTheme}>
              {theme === "light" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
            </button>
            <Link href="/" className="gd-icon-button" title="Abrir a loja" aria-label="Abrir a loja"><Store aria-hidden="true" /></Link>
            <form method="post" action="/api/admin/logout" style={{ display: "contents" }}>
              <button type="submit" className="gd-icon-button" title="Sair" aria-label="Sair"><LogOut aria-hidden="true" /></button>
            </form>
          </div>
        </header>

        <div className="gd-stage-wrap">
          <main className="gd-stage">
            <div className="gd-stage-scroll">{children}</div>
          </main>
          <SideDock pathname={pathname} />
          <Dock pathname={pathname} />
        </div>
        <footer className="gd-footer"><span>DinoBlack Games e Informática</span></footer>
      </div>
      {search && <QuickNav close={() => setSearch(false)} anchor={searchAnchor} />}
    </div>
  );
}
