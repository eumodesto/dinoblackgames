import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pacotes de servidor que carregam binários/wasm: não entram no bundle.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
