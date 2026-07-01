'use client';

import { ZkAuthProvider } from '@supreme2580/zkauth';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ZkAuthProvider appId="cmqcnrgfd00650dl2djjr7892">
      {children}
    </ZkAuthProvider>
  );
}
