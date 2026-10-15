import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Целосно статична изградба — сите страници се пререндираат при build.
  output: 'export',
  trailingSlash: true,
  images: {
    // Статичен извоз: нема серверски оптимизатор, користиме обични <img>.
    unoptimized: true,
  },
  // Нема runtime на сервер — сето што е динамично мора да е на ниво на build.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
