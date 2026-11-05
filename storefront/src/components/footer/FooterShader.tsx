"use client";

import dynamic from "next/dynamic";

// O shader (WebGL) só carrega no navegador e depois do conteúdo principal,
// para não pesar no primeiro carregamento da página.
const FlutedGlass = dynamic(
  () => import("@paper-design/shaders-react").then((m) => m.FlutedGlass),
  { ssr: false },
);

export function FooterShader() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      <FlutedGlass
        size={0.89}
        shape="lines"
        angle={0}
        distortionShape="prism"
        distortion={0.5}
        shift={0}
        blur={0}
        edges={0.25}
        stretch={0}
        scale={1.11}
        fit="cover"
        highlights={0.1}
        shadows={0.2}
        grainMixer={0.1}
        grainOverlay={0.1}
        colorBack="#00000000"
        colorHighlight="#FFFFFF"
        colorShadow="#000000"
        className="h-full w-full bg-transparent"
      />
    </div>
  );
}
