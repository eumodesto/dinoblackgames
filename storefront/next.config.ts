import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pasta de build configurável: permite subir uma segunda instância (testes) sem pisar na .next do servidor principal.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Pacotes de servidor que carregam binários/wasm: não entram no bundle.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  // Inclui migrations/seed do monorepo no bundle das rotas de API (CHECKOUT_DB=local).
  outputFileTracingIncludes: {
    "/api/**/*": ["../supabase/migrations/**/*", "../supabase/seed.sql"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // Imagens dos produtos (bucket público "produtos" do Supabase Storage)
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
