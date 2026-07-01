import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  transpilePackages: [
    "@aztec/bb.js",
    "@noir-lang/noir_js",
    "@noir-lang/acvm_js",
    "@noir-lang/noirc_abi",
  ],
  webpack: (config, { isServer }) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };
    }
    config.ignoreWarnings = [
      { module: /node_modules\/ox\// },
    ];
    return config;
  },
};

export default nextConfig;
