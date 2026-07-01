import React, { useEffect, type ReactNode } from 'react';
import { initializeState } from '../state';

export function ZkAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    initializeState();
  }, []);

  return <>{children}</>;
}

export { useZkAuth } from './useZkAuth';
