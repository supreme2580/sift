export interface ContractConfig {
  rpcUrl: string;
  networkPassphrase: string;
  contractId: string;
  nativeTokenId: string;
}

export function getContractConfig(): ContractConfig {
  return {
    rpcUrl: import.meta.env.VITE_RPC_URL || 'https://soroban-testnet.stellar.org',
    networkPassphrase: import.meta.env.VITE_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
    contractId: import.meta.env.VITE_CONTRACT_ID || '',
    nativeTokenId: import.meta.env.VITE_NATIVE_TOKEN_ID || '',
  };
}
