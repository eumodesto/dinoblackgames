"use client";

import type { ReactNode } from "react";
import { AdminImageField } from "./AdminImageField";

export type HighlightFormState = {
  enabled: boolean;
  position: string;
  eyebrow: string;
  headline: string;
  description: string;
  ctaLabel: string;
  imageUrl: string;
  badge: string;
  /** Data/hora local no formato do <input type="datetime-local"> (AAAA-MM-DDTHH:mm). */
  endsAt: string;
};

export type HighlightsState = { hero: HighlightFormState; flash: HighlightFormState };
export type HighlightUsage = { used: { hero: number; flash: number }; limits: { hero: number; flash: number } };

export const emptyHighlight = (): HighlightFormState => ({ enabled: false, position: "", eyebrow: "", headline: "", description: "", ctaLabel: "", imageUrl: "", badge: "", endsAt: "" });
export const emptyHighlights = (): HighlightsState => ({ hero: emptyHighlight(), flash: emptyHighlight() });
export const defaultUsage: HighlightUsage = { used: { hero: 0, flash: 0 }, limits: { hero: 10, flash: 5 } };

/** ISO (UTC) → valor local do datetime-local. */
export function isoToLocalInput(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Valor local do datetime-local → ISO (UTC), ou "" se vazio. */
export function localInputToIso(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

const input = "mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-dino-red";
const label = "text-xs font-bold uppercase tracking-wide text-zinc-400";

function Text({ title, value, onChange, placeholder, type = "text", max }: { title: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; max?: number }) {
  return (
    <label className="block">
      <span className={label}>{title}</span>
      <input className={input} type={type} value={value} placeholder={placeholder} maxLength={max} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Slot({ title, hint, used, limit, enabled, onToggle, children }: { title: string; hint: string; used: number; limit: number; enabled: boolean; onToggle: (next: boolean) => void; children: ReactNode }) {
  // `used` já exclui este produto; a vaga está cheia quando os OUTROS ocupam todo o limite.
  const full = used >= limit && !enabled;
  const shown = used + (enabled ? 1 : 0);
  return (
    <div className="rounded-xl border border-zinc-800 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-white">{title}</h3>
          <p className="mt-1 text-xs text-zinc-500">{hint}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${shown >= limit ? "border-amber-500/40 text-amber-400" : "border-zinc-700 text-zinc-400"}`}>{shown} de {limit} vagas</span>
      </div>
      <label className={`mt-4 flex items-center gap-2 text-sm font-semibold ${full ? "text-zinc-500" : "text-zinc-200"}`}>
        <input type="checkbox" checked={enabled} disabled={full} onChange={(event) => onToggle(event.target.checked)} />
        Mostrar este produto aqui
      </label>
      {full && <p className="mt-2 text-xs text-amber-400">Todas as {limit} vagas estão ocupadas por outros produtos. Remova um deles para liberar uma vaga.</p>}
      {enabled && <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>}
    </div>
  );
}

/** Seção "Destaque na página inicial" do cadastro/edição do produto: slider (até 10) e Flash Drop (até 5). */
export function ProductHighlightsSection({ value, onChange, usage, published = true }: { value: HighlightsState; onChange: (next: HighlightsState) => void; usage: HighlightUsage; published?: boolean }) {
  const set = (slot: "hero" | "flash", patch: Partial<HighlightFormState>) => onChange({ ...value, [slot]: { ...value[slot], ...patch } });
  const { hero, flash } = value;
  const flashEnded = flash.enabled && flash.endsAt !== "" && new Date(flash.endsAt).getTime() <= Date.now();
  return (
    <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div>
        <h2 className="font-bold text-white">Destaque na página inicial</h2>
        <p className="mt-1 text-xs text-zinc-500">Escolha onde este produto aparece no banner da home. Nome, imagem, preço, desconto, avaliação, vendidos e estoque vêm do próprio cadastro. Só produtos <strong>publicados</strong> aparecem.</p>
      </div>
      {!published && (hero.enabled || flash.enabled) && (
        <p role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">Este produto não está publicado, então o destaque não aparece na home. Mude o status para <strong>Publicado</strong> para ele entrar no banner.</p>
      )}
      {flashEnded && (
        <p role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">A data de fim do Flash Drop já passou, então ele não aparece mais. Ajuste a data ou deixe vazio.</p>
      )}

      <Slot title="Slider principal (esquerda)" hint="Slide grande com título, texto e botão que leva à página do produto." used={usage.used.hero} limit={usage.limits.hero} enabled={hero.enabled} onToggle={(enabled) => set("hero", { enabled })}>
        <Text title="Texto acima do título" value={hero.eyebrow} onChange={(eyebrow) => set("hero", { eyebrow })} placeholder="Ex.: Performance para jogo e criação" max={80} />
        <Text title="Ordem (menor aparece primeiro)" type="number" value={hero.position} onChange={(position) => set("hero", { position })} placeholder="Vazio = no fim" />
        <Text title="Título do slide" value={hero.headline} onChange={(headline) => set("hero", { headline })} placeholder="Vazio = nome do produto" max={120} />
        <Text title="Texto do botão" value={hero.ctaLabel} onChange={(ctaLabel) => set("hero", { ctaLabel })} placeholder="Explorar agora" max={40} />
        <div className="md:col-span-2"><Text title="Frase de apoio" value={hero.description} onChange={(description) => set("hero", { description })} placeholder="Vazio = resumo curto do produto" max={220} /></div>
        <div className="md:col-span-2"><AdminImageField uploadName="destaque-home" title="Imagem de fundo" value={hero.imageUrl} onChange={(imageUrl) => set("hero", { imageUrl })} placeholder="Ou cole um link. Vazio = imagem principal do produto. Prefira uma imagem larga (ex.: 1600×700)." /></div>
      </Slot>

      <Slot title="Flash Drop (direita)" hint="Cartão da oferta do dia, com contagem regressiva, avaliação e barra de estoque." used={usage.used.flash} limit={usage.limits.flash} enabled={flash.enabled} onToggle={(enabled) => set("flash", { enabled })}>
        <Text title="Selo sobre a imagem" value={flash.badge} onChange={(badge) => set("flash", { badge })} placeholder="Oferta exclusiva" max={40} />
        <Text title="Ordem (menor aparece primeiro)" type="number" value={flash.position} onChange={(position) => set("flash", { position })} placeholder="Vazio = no fim" />
        <Text title="Oferta termina em" type="datetime-local" value={flash.endsAt} onChange={(endsAt) => set("flash", { endsAt })} />
        <p className="self-end pb-2 text-xs leading-5 text-zinc-500">A contagem regressiva usa esta data; ao terminar, o produto sai do Flash Drop sozinho. Vazio = sem contagem. O preço promocional e o preço original do cadastro viram o desconto mostrado.</p>
      </Slot>
    </div>
  );
}
