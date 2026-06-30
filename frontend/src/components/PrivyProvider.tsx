import type { ReactNode } from 'react';
import { PrivyProvider as PrivyAuthProvider } from '@privy-io/react-auth';

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || '';

export function PrivyProvider({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID) {
    console.warn('VITE_PRIVY_APP_ID not set');
    return <>{children}</>;
  }

  return (
    <PrivyAuthProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: { theme: 'dark', accentColor: '#d4a259' },
        loginMethods: [
          'google',
          'discord',
          'twitter',
          'github',
          'email',
          'telegram',
          'tiktok',
        ],
        embeddedWallets: {
          ethereum: { createOnLogin: 'all-users' },
          solana: { createOnLogin: 'off' },
        },
      }}
    >
      {children}
    </PrivyAuthProvider>
  );
}
