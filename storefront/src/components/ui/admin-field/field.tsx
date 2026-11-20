"use client";

import { Field as BaseField } from "@base-ui/react/field";
import type { ComponentProps } from "react";

type WithClass<T> = Omit<T, "className"> & { className?: string };

/** Agrupa rótulo, controle e descrição de um campo do admin (estilo definido em admin-glass.css). */
export function Field({ className = "", ...props }: WithClass<ComponentProps<typeof BaseField.Root>>) {
  return <BaseField.Root className={`gd-field ${className}`} {...props} />;
}

export function FieldLabel({ className = "", ...props }: WithClass<ComponentProps<typeof BaseField.Label>>) {
  return <BaseField.Label className={`gd-field-label ${className}`} {...props} />;
}

export function FieldDescription({ className = "", ...props }: WithClass<ComponentProps<typeof BaseField.Description>>) {
  return <BaseField.Description className={`gd-field-desc ${className}`} {...props} />;
}

export function FieldError({ className = "", ...props }: WithClass<ComponentProps<typeof BaseField.Error>>) {
  return <BaseField.Error className={`gd-field-error ${className}`} {...props} />;
}
