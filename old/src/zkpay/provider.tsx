import { PrivyProvider as PrivyAuthProvider } from '@privy-io/react-auth';
import type { ReactNode } from 'react';

interface ZkPayProviderProps {
  privyAppId: string;
  children: ReactNode;
}

export function ZkPayProvider({ privyAppId, children }: ZkPayProviderProps) {
  return (
    <PrivyAuthProvider
      appId={privyAppId}
      config={{
        embeddedWallets: {
          ethereum: { createOnLogin: 'all-users', noPromptOnSignature: true },
        },
        appearance: { theme: 'dark' },
      }}
    >
      {children}
    </PrivyAuthProvider>
  );
}
