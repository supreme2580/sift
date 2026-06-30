import { createContext, useContext } from 'react';

export type StellarSigner = {
  address: string;
  signTransaction: (txXdr: string) => Promise<string>;
};

export type StellarState = {
  isConnected: boolean;
  address: string | null;
  disconnect: () => void;
  signer: StellarSigner | null;
};

export const StellarContext = createContext<StellarState>({
  isConnected: false,
  address: null,
  disconnect: () => {},
  signer: null,
});

export function useStellar() {
  return useContext(StellarContext);
}
