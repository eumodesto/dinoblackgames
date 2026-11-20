"use client";

import { Autocomplete as BaseAutocomplete } from "@base-ui/react/autocomplete";
import { ChevronDown } from "lucide-react";
import { useEffect, useState, type ComponentProps } from "react";

type WithClass<T> = Omit<T, "className"> & { className?: string };

/** Raiz do Autocomplete (Base UI). Recebe `items`, `value` (texto), `filter` etc. */
export const Autocomplete = BaseAutocomplete.Root;

/** Campo de texto com botão de abrir a lista. */
export function AutocompleteInput({ className = "", ...props }: WithClass<ComponentProps<typeof BaseAutocomplete.Input>>) {
  return (
    <div className="gd-ac">
      <BaseAutocomplete.Input className={`gd-ac-input ${className}`} {...props} />
      <BaseAutocomplete.Trigger className="gd-ac-trigger" aria-label="Abrir opções" tabIndex={-1}>
        <ChevronDown aria-hidden="true" />
      </BaseAutocomplete.Trigger>
    </div>
  );
}

/**
 * Lista suspensa. O portal fica dentro de .gd-app: fora dele os tokens --gd-* (cores, tema) não existiriam.
 */
export function AutocompletePopup({ className = "", children, ...props }: WithClass<ComponentProps<typeof BaseAutocomplete.Popup>>) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => setContainer(document.querySelector<HTMLElement>(".gd-app")), []);
  return (
    <BaseAutocomplete.Portal container={container}>
      <BaseAutocomplete.Positioner sideOffset={6} className="gd-ac-positioner">
        <BaseAutocomplete.Popup className={`gd-ac-popup ${className}`} {...props}>{children}</BaseAutocomplete.Popup>
      </BaseAutocomplete.Positioner>
    </BaseAutocomplete.Portal>
  );
}

export function AutocompleteList({ className = "", ...props }: WithClass<ComponentProps<typeof BaseAutocomplete.List>>) {
  return <BaseAutocomplete.List className={`gd-ac-list ${className}`} {...props} />;
}

export function AutocompleteItem({ className = "", ...props }: WithClass<ComponentProps<typeof BaseAutocomplete.Item>>) {
  return <BaseAutocomplete.Item className={`gd-ac-item ${className}`} {...props} />;
}

export function AutocompleteEmpty({ className = "", ...props }: WithClass<ComponentProps<typeof BaseAutocomplete.Empty>>) {
  return <BaseAutocomplete.Empty className={`gd-ac-empty ${className}`} {...props} />;
}
