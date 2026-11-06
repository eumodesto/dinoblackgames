"use client";

import { useEffect, useRef, useState } from "react";

/** Mínimo do SDK do Mercado Pago (MercadoPago.js v2) que usamos. */
type BrickController = { unmount: () => void };
type BrickSettings = {
  initialization: { amount: number; payer?: { email?: string } };
  customization: {
    paymentMethods: Record<string, unknown>;
    visual?: { style?: { theme?: string }; hidePaymentButton?: boolean; texts?: Record<string, string> };
  };
  callbacks: {
    onReady?: () => void;
    onSubmit: (data: { selectedPaymentMethod: string; formData: Record<string, unknown> }) => Promise<void>;
    onError?: (error: { type?: string; message?: string }) => void;
  };
};
type MercadoPagoCtor = new (publicKey: string, opts?: { locale?: string }) => {
  bricks: () => { create: (name: string, container: string, settings: BrickSettings) => Promise<BrickController> };
};
declare global {
  interface Window {
    MercadoPago?: MercadoPagoCtor;
  }
}

const SDK_URL = "https://sdk.mercadopago.com/js/v2";
let sdkPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve();
  if (!sdkPromise) {
    sdkPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        sdkPromise = null;
        reject(new Error("Não foi possível carregar o Mercado Pago."));
      };
      document.head.appendChild(script);
    });
  }
  return sdkPromise;
}

/**
 * Payment Brick do Mercado Pago: cartão e Pix. Os dados do cartão vão direto do navegador ao Mercado Pago;
 * nosso servidor só recebe um token. O valor cobrado é decidido no servidor, não aqui.
 */
export function PaymentBrick({
  publicKey,
  amount,
  email,
  maxInstallments,
  onSubmit,
}: {
  publicKey: string;
  amount: number;
  email?: string;
  maxInstallments: number;
  onSubmit: (formData: Record<string, unknown>) => Promise<void>;
}) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;

  useEffect(() => {
    let controller: BrickController | null = null;
    let cancelled = false;
    setState("loading");

    (async () => {
      try {
        await loadSdk();
        if (cancelled || !window.MercadoPago) return;
        const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        const dark = document.documentElement.classList.contains("dark");
        controller = await mp.bricks().create("payment", "mp-payment-brick", {
          initialization: { amount, ...(email ? { payer: { email } } : {}) },
          customization: {
            paymentMethods: { creditCard: "all", bankTransfer: ["pix"], maxInstallments },
            visual: { style: { theme: dark ? "dark" : "default" } },
          },
          callbacks: {
            onReady: () => !cancelled && setState("ready"),
            onSubmit: ({ formData }) => submitRef.current(formData),
            onError: (e) => {
              console.error("[mercadopago brick]", e);
              if (!cancelled) {
                setError("Não foi possível exibir o pagamento. Atualize a página e tente de novo.");
                setState("error");
              }
            },
          },
        });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro ao carregar o pagamento.");
          setState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        controller?.unmount();
      } catch {
        // o SDK já desmontou
      }
    };
  }, [publicKey, amount, email, maxInstallments]);

  return (
    <div>
      {state === "loading" && (
        <div className="space-y-3" aria-busy="true" aria-label="Carregando formas de pagamento">
          <div className="h-14 animate-pulse rounded-2xl bg-gray-200 dark:bg-zinc-800" />
          <div className="h-14 animate-pulse rounded-2xl bg-gray-200 dark:bg-zinc-800" />
          <div className="h-40 animate-pulse rounded-2xl bg-gray-200 dark:bg-zinc-800" />
        </div>
      )}
      {state === "error" && (
        <p role="alert" className="rounded-2xl border border-dino-red/40 bg-dino-red/10 p-4 text-sm font-semibold text-dino-red">
          {error}
        </p>
      )}
      <div id="mp-payment-brick" className={state === "error" ? "hidden" : ""} />
    </div>
  );
}
