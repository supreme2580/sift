'use client';

import { ZkAuthProvider } from '@supreme2580/zkauth';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ZkAuthProvider>
      {children}
    </ZkAuthProvider>
  );
}
