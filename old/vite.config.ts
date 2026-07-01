import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [react(), nodePolyfills({
    globals: { Buffer: true, global: true, process: true },
  })],
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    include: ['@privy-io/react-auth', '@stellar/stellar-sdk'],
    exclude: ['@aztec/bb.js', '@noir-lang/noir_js', '@noir-lang/acvm_js', '@noir-lang/noirc_abi'],
  },
  server: {
    host: true,
    port: 5173,
  },
});
