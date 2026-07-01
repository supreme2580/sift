import React, { useEffect, type ReactNode } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { initializeState } from '../state';

export function ZkAuthProvider({
  children,
  appId,
}: {
  children: ReactNode;
  appId: string;
}) {
  useEffect(() => {
    initializeState();
  }, []);

  return (
    <PrivyProvider
      appId={appId}
      config={{
        embeddedWallets: {
          ethereum: { createOnLogin: 'all-users' },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}

export { useZkAuth } from './useZkAuth';
