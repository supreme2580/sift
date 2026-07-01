'use client';

import { ZkAuthProvider } from '@zkauth/sdk';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ZkAuthProvider appId="cmqcnrgfd00650dl2djjr7892">
      {children}
    </ZkAuthProvider>
  );
}
