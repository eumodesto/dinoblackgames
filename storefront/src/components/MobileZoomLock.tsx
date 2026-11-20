"use client";

import { useEffect } from "react";

/** O Safari do iPhone ignora user-scalable=no; este bloqueio de gestos de pinça cobre esse caso (só em tela estreita). */
export function MobileZoomLock() {
  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 767px)");
    const block = (event: Event) => {
      if (narrow.matches) event.preventDefault();
    };
    const blockPinch = (event: TouchEvent) => {
      if (narrow.matches && event.touches.length > 1) event.preventDefault();
    };
    const options = { passive: false } as const;
    document.addEventListener("gesturestart", block, options);
    document.addEventListener("gesturechange", block, options);
    document.addEventListener("touchmove", blockPinch, options);
    return () => {
      document.removeEventListener("gesturestart", block);
      document.removeEventListener("gesturechange", block);
      document.removeEventListener("touchmove", blockPinch);
    };
  }, []);

  return null;
}
