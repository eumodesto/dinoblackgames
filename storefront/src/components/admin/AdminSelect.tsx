"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Autocomplete,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
} from "@/components/ui/admin-field/autocomplete";

export type SelectOption = { value: string; label: string };

type Props = {
  options: readonly SelectOption[];
  /** Controlado. Sem `value`, o componente guarda o próprio estado (use `defaultValue`). */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Quando informado, um <input type="hidden"> leva o valor escolhido em formulários nativos (GET/POST). */
  name?: string;
  placeholder?: string;
  "aria-label"?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Substitui o <select> nativo pelo modelo Autocomplete do design system: campo com busca e lista suspensa.
 * Funciona como select: o texto mostra a opção escolhida; ao abrir, a lista mostra todas as opções.
 */
export function AdminSelect({ options, value, defaultValue = "", onValueChange, name, placeholder, required, disabled, className = "", ...rest }: Props) {
  const [inner, setInner] = useState(defaultValue);
  const selected = value ?? inner;
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? "";
  const optionsKey = options.map((o) => `${o.value}:${o.label}`).join("|");
  const [text, setText] = useState(() => labelOf(selected));
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // Mantém o texto igual à opção escolhida enquanto a lista está fechada (também após escolher ou digitar algo inválido).
  useEffect(() => {
    if (!open) setText(options.find((o) => o.value === selected)?.label ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `options` entra por optionsKey (evita reset a cada render com array novo)
  }, [open, selected, optionsKey]);

  // Validação nativa de "obrigatório" para o campo visível.
  useEffect(() => {
    wrap.current?.querySelector<HTMLInputElement>("input:not([type=hidden])")?.setCustomValidity(required && !selected ? "Selecione uma opção." : "");
  }, [required, selected]);

  function pick(next: string) {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  }

  const current = labelOf(selected);

  return (
    <div ref={wrap} className={`gd-ac-wrap ${className}`}>
      <Autocomplete
        items={options}
        value={text}
        open={open}
        onOpenChange={(next) => setOpen(next)}
        openOnInputClick
        itemToStringValue={(option: SelectOption) => option.label}
        filter={(option: SelectOption, query: string) => !query || query === current || plain(option.label).includes(plain(query))}
        onValueChange={(next) => {
          setText(next);
          const hit = options.find((o) => o.label === next);
          if (hit && hit.value !== selected) pick(hit.value);
        }}
        disabled={disabled}
      >
        <AutocompleteInput aria-label={rest["aria-label"]} placeholder={placeholder} />
        <AutocompletePopup>
          <AutocompleteEmpty>Nada encontrado.</AutocompleteEmpty>
          <AutocompleteList>
            {(option: SelectOption) => (
              <AutocompleteItem key={option.value} value={option} data-selected={option.value === selected ? "" : undefined}>
                <span>{option.label}</span>
                {option.value === selected && <Check aria-hidden="true" />}
              </AutocompleteItem>
            )}
          </AutocompleteList>
        </AutocompletePopup>
      </Autocomplete>
      {name && <input type="hidden" name={name} value={selected} />}
    </div>
  );
}
