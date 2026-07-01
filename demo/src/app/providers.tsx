'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId="cmqcnrgfd00650dl2djjr7892"
      config={{
        embeddedWallets: {
          ethereum: { createOnLogin: 'all-users' },
        },
        appearance: { theme: 'dark' },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
