"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminMultiPick, type PickOption } from "./AdminMultiPick";
import { AdminSelect } from "./AdminSelect";
import { isoToLocalInput, localInputToIso } from "./ProductHighlightsSection";

type Coupon = {
  id: string; code: string; title: string | null; kind: "percent" | "amount"; value: number | string; min_subtotal: number | string; min_quantity: number;
  max_uses: number | null; max_uses_per_user: number; starts_at: string | null; ends_at: string | null; is_active: boolean; auto_apply: boolean;
  scope: "all" | "categories" | "products"; payment_methods: string[]; first_purchase_only: boolean; allowed_emails: string[];
  redemption_count: number; category_ids: string[]; product_ids: string[];
};

type Form = {
  code: string; title: string; kind: "percent" | "amount"; value: string; minSubtotal: string; minQuantity: string; maxUses: string; maxUsesPerUser: string;
  startsAt: string; endsAt: string; isActive: boolean; autoApply: boolean; scope: "all" | "categories" | "products";
  categoryIds: string[]; productIds: string[]; paymentMethods: string[]; firstPurchaseOnly: boolean; allowedEmails: string;
};

const empty: Form = {
  code: "", title: "", kind: "percent", value: "", minSubtotal: "0", minQuantity: "0", maxUses: "", maxUsesPerUser: "1", startsAt: "", endsAt: "", isActive: true,
  autoApply: false, scope: "all", categoryIds: [], productIds: [], paymentMethods: [], firstPurchaseOnly: false, allowedEmails: "",
};

const PAYMENTS = [{ id: "pix", label: "Pix" }, { id: "credit_card", label: "Cartão de crédito" }];
const input = "mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white";
const label = "text-xs font-bold uppercase tracking-wide text-zinc-400";
const brl = (n: number | string) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : null);

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/** Link que, ao ser aberto, já adiciona o cupom (ele é aplicado no checkout). */
const couponLink = (code: string) => (typeof window === "undefined" ? "" : `${window.location.origin}/?cupom=${encodeURIComponent(code)}`);

function rules(c: Coupon): string[] {
  const out: string[] = [];
  if (c.auto_apply) out.push("Automático");
  if (c.scope === "categories") out.push(`${c.category_ids.length} categoria${c.category_ids.length === 1 ? "" : "s"}`);
  if (c.scope === "products") out.push(`${c.product_ids.length} produto${c.product_ids.length === 1 ? "" : "s"}`);
  if (c.payment_methods.length) out.push(c.payment_methods.map((m) => (m === "pix" ? "Pix" : "Cartão")).join(" ou "));
  if (c.min_quantity > 0) out.push(`${c.min_quantity}+ un.`);
  if (Number(c.min_subtotal) > 0) out.push(`mín. ${brl(c.min_subtotal)}`);
  if (c.first_purchase_only) out.push("1ª compra");
  if (c.allowed_emails.length) out.push(`${c.allowed_emails.length} e-mail${c.allowed_emails.length === 1 ? "" : "s"}`);
  return out;
}

export function AdminCoupons() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [form, setForm] = useState<Form>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("Carregando…");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState("");
  const [options, setOptions] = useState<{ categories: PickOption[]; products: PickOption[] }>({ categories: [], products: [] });

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/coupons");
    const data = await response.json();
    setItems(data.coupons ?? []);
    setMessage("");
  }, []);

  useEffect(() => {
    load().catch(() => setMessage("Não foi possível carregar cupons."));
    fetch("/api/admin/coupons/options").then((r) => r.json()).then((data: { categories: { id: string; name: string }[]; products: { id: string; name: string; sku: string }[] }) => {
      setOptions({ categories: data.categories.map((c) => ({ id: c.id, label: c.name })), products: data.products.map((p) => ({ id: p.id, label: p.name, hint: p.sku })) });
    }).catch(() => setMessage("Não foi possível carregar categorias e produtos."));
  }, [load]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggle = (key: "paymentMethods", id: string) => setForm((current) => ({ ...current, [key]: current[key].includes(id) ? current[key].filter((v) => v !== id) : [...current[key], id] }));

  function startEdit(c: Coupon) {
    setEditing(c.id);
    setForm({
      code: c.code, title: c.title ?? "", kind: c.kind, value: String(c.value), minSubtotal: String(c.min_subtotal), minQuantity: String(c.min_quantity),
      maxUses: c.max_uses == null ? "" : String(c.max_uses), maxUsesPerUser: String(c.max_uses_per_user), startsAt: isoToLocalInput(c.starts_at ?? ""), endsAt: isoToLocalInput(c.ends_at ?? ""),
      isActive: c.is_active, autoApply: c.auto_apply, scope: c.scope, categoryIds: c.category_ids, productIds: c.product_ids, paymentMethods: c.payment_methods,
      firstPurchaseOnly: c.first_purchase_only, allowedEmails: c.allowed_emails.join("\n"),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() { setEditing(null); setForm(empty); }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setMessage("Salvando…");
    const body = { ...form, startsAt: localInputToIso(form.startsAt), endsAt: localInputToIso(form.endsAt) };
    const response = await fetch(editing ? `/api/admin/coupons/${editing}` : "/api/admin/coupons", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) return setMessage(data.error ?? "Não foi possível salvar.");
    reset();
    await load();
    setMessage("Cupom salvo.");
  }

  async function deactivate(id: string) {
    if (!window.confirm("Desativar este cupom?")) return;
    const response = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error ?? "Não foi possível desativar.");
    await load();
  }

  async function copy(code: string) {
    try { await navigator.clipboard.writeText(couponLink(code)); setCopied(code); setTimeout(() => setCopied(""), 2000); } catch { setMessage(`Copie manualmente: ${couponLink(code)}`); }
  }

  const link = form.code.trim() ? couponLink(form.code.trim().toUpperCase().replace(/\s+/g, "")) : "";

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(420px,520px)_1fr]">
      <form onSubmit={save} className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="font-bold text-white">{editing ? "Editar cupom" : "Novo cupom"}</h2>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-white">Identificação</h3>
          <label className="block"><span className={label}>Código</span>
            <div className="flex gap-2">
              <input required value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s+/g, ""))} placeholder="BEMVINDO10" maxLength={40} className={`${input} font-mono uppercase`} />
              <button type="button" onClick={() => set("code", randomCode())} className="mt-1 h-11 shrink-0 rounded-xl border border-zinc-700 px-3 text-xs font-bold text-zinc-300 hover:text-white">Gerar</button>
            </div>
          </label>
          <label className="block"><span className={label}>Nome do cupom (aparece para o cliente)</span><input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: 10% no Pix" maxLength={80} className={input} /></label>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-white">Desconto</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><span className={label}>Tipo</span><AdminSelect className="mt-1" value={form.kind} onValueChange={(v) => set("kind", v as Form["kind"])} options={[{ value: "percent", label: "Percentual (%)" }, { value: "amount", label: "Valor fixo (R$)" }]} aria-label="Tipo de desconto" /></div>
            <label className="block"><span className={label}>Valor {form.kind === "percent" ? "(%)" : "(R$)"}</span><input required type="number" min="0.01" max={form.kind === "percent" ? 100 : undefined} step="0.01" value={form.value} onChange={(e) => set("value", e.target.value)} className={input} /></label>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-white">Como o cupom é aplicado</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {[{ auto: false, title: "Com código", text: "O cliente digita o código ou abre o link do cupom." }, { auto: true, title: "Automático", text: "Vale sozinho quando o carrinho atende às condições." }].map((option) => (
              <label key={String(option.auto)} className={`cursor-pointer rounded-xl border p-3 text-sm ${form.autoApply === option.auto ? "border-dino-red" : "border-zinc-700"}`}>
                <span className="flex items-center gap-2 font-bold text-white"><input type="radio" name="aplicacao" checked={form.autoApply === option.auto} onChange={() => set("autoApply", option.auto)} />{option.title}</span>
                <span className="mt-1 block text-xs text-zinc-500">{option.text}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-white">Onde vale</h3>
          <AdminSelect value={form.scope} onValueChange={(v) => set("scope", v as Form["scope"])} aria-label="Onde o cupom vale"
            options={[{ value: "all", label: "Todos os produtos" }, { value: "categories", label: "Categorias escolhidas" }, { value: "products", label: "Produtos escolhidos" }]} />
          {form.scope === "categories" && <AdminMultiPick options={options.categories} value={form.categoryIds} onChange={(ids) => set("categoryIds", ids)} placeholder="Buscar categoria…" aria-label="Categorias do cupom" />}
          {form.scope === "products" && <AdminMultiPick options={options.products} value={form.productIds} onChange={(ids) => set("productIds", ids)} placeholder="Buscar produto ou SKU…" aria-label="Produtos do cupom" />}
          {form.scope !== "all" && <p className="text-xs text-zinc-500">O desconto, o valor mínimo e a quantidade mínima consideram só os itens escolhidos.</p>}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-white">Condições</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className={label}>Valor mínimo (R$)</span><input type="number" min="0" step="0.01" value={form.minSubtotal} onChange={(e) => set("minSubtotal", e.target.value)} className={input} /></label>
            <label className="block"><span className={label}>Quantidade mínima</span><input type="number" min="0" step="1" value={form.minQuantity} onChange={(e) => set("minQuantity", e.target.value)} placeholder="0 = sem mínimo" className={input} /></label>
          </div>
          <p className="text-xs text-zinc-500">Quantidade mínima: use 2, 3, 4 ou mais para quem leva várias unidades.</p>
          <div>
            <span className={label}>Forma de pagamento</span>
            <div className="mt-1 flex flex-wrap gap-4 text-sm text-zinc-200">
              {PAYMENTS.map((method) => <label key={method.id} className="flex items-center gap-2"><input type="checkbox" checked={form.paymentMethods.includes(method.id)} onChange={() => toggle("paymentMethods", method.id)} />{method.label}</label>)}
            </div>
            <p className="mt-1 text-xs text-zinc-500">Nenhuma marcada = vale em qualquer forma de pagamento.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-200"><input type="checkbox" checked={form.firstPurchaseOnly} onChange={(e) => set("firstPurchaseOnly", e.target.checked)} />Só na primeira compra do cliente</label>
          <label className="block"><span className={label}>E-mails que podem usar (um por linha)</span>
            <textarea value={form.allowedEmails} onChange={(e) => set("allowedEmails", e.target.value)} rows={3} placeholder="Vazio = qualquer cliente" className={`${input} h-auto py-2`} />
          </label>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-white">Limites e prazo</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className={label}>Limite total de usos</span><input type="number" min="1" step="1" value={form.maxUses} onChange={(e) => set("maxUses", e.target.value)} placeholder="Sem limite" className={input} /></label>
            <label className="block"><span className={label}>Usos por cliente</span><input type="number" min="1" step="1" value={form.maxUsesPerUser} onChange={(e) => set("maxUsesPerUser", e.target.value)} className={input} /></label>
            <label className="block"><span className={label}>Início</span><input type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} className={input} /></label>
            <label className="block"><span className={label}>Fim</span><input type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} className={input} /></label>
          </div>
        </section>

        <section className="space-y-2 rounded-xl border border-zinc-800 p-3">
          <h3 className="text-sm font-bold text-white">Link do cupom</h3>
          {form.autoApply
            ? <p className="text-xs text-zinc-500">Este cupom é automático: não precisa de link nem de código, o desconto entra sozinho quando as condições são atendidas.</p>
            : link
              ? <>
                  <div className="flex gap-2"><input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Link do cupom" className={`${input} mt-0 font-mono text-xs`} /><button type="button" onClick={() => copy(form.code.trim().toUpperCase())} className="h-11 shrink-0 rounded-xl border border-zinc-700 px-3 text-xs font-bold text-zinc-300 hover:text-white">{copied === form.code.trim().toUpperCase() ? "Copiado!" : "Copiar"}</button></div>
                  <p className="text-xs text-zinc-500">Quem abrir este link já recebe o cupom: ele é aplicado sozinho no checkout, se o carrinho atender às condições.</p>
                </>
              : <p className="text-xs text-zinc-500">Informe o código para gerar o link.</p>}
        </section>

        <label className="flex items-center gap-2 text-sm text-zinc-200"><input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />Ativo</label>
        <div className="flex gap-2">
          <button disabled={saving} className="rounded-xl bg-dino-red px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{editing ? "Salvar" : "Criar"}</button>
          {editing && <button type="button" onClick={reset} className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-bold text-zinc-300">Cancelar</button>}
        </div>
        <p className="text-xs text-zinc-500" role="status">{message}</p>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900"><tr><th className="px-4 py-3 text-zinc-400">Cupom</th><th className="px-4 py-3 text-zinc-400">Desconto</th><th className="px-4 py-3 text-zinc-400">Regras</th><th className="px-4 py-3 text-zinc-400">Usos</th><th className="px-4 py-3 text-zinc-400">Validade</th><th className="px-4 py-3 text-zinc-400">Status</th><th className="px-4 py-3 text-zinc-400">Ações</th></tr></thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {items.map((c) => {
              const from = day(c.starts_at); const to = day(c.ends_at);
              return (
                <tr key={c.id}>
                  <td className="px-4 py-3"><div className="font-mono text-xs font-bold text-white">{c.code}</div>{c.title && <div className="text-xs text-zinc-500">{c.title}</div>}</td>
                  <td className="px-4 py-3 font-semibold text-white">{c.kind === "percent" ? `${Number(c.value)}%` : brl(c.value)}</td>
                  <td className="px-4 py-3"><div className="flex max-w-56 flex-wrap gap-1">{rules(c).map((rule) => <span key={rule} className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300">{rule}</span>)}{rules(c).length === 0 && <span className="text-xs text-zinc-500">Sem condições</span>}</div></td>
                  <td className="px-4 py-3 text-zinc-400">{c.redemption_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{from || to ? `${from ?? "—"} → ${to ?? "sem fim"}` : "Sem prazo"}</td>
                  <td className="px-4 py-3 text-zinc-400">{c.is_active ? "Ativo" : "Inativo"}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <button onClick={() => startEdit(c)} className="mr-3 text-xs font-bold text-zinc-300 hover:text-white">Editar</button>
                    {!c.auto_apply && <button onClick={() => copy(c.code)} className="mr-3 text-xs font-bold text-zinc-300 hover:text-white">{copied === c.code ? "Copiado!" : "Copiar link"}</button>}
                    {c.is_active && <button onClick={() => deactivate(c.id)} className="text-xs font-bold text-amber-400 hover:text-amber-300">Desativar</button>}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-zinc-500">Nenhum cupom ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
