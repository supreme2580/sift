'use client';

import { ZkAuthButton, useZkAuth } from '@supreme2580/zkauth';

function BalanceDisplay() {
  const { balance, connected } = useZkAuth();
  if (!connected) return null;
  return (
    <div className="balance-display">
      Balance: {Number(balance) / 1e7} XLM
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="app">
        <div className="nav-links">
          <a href="/">zkAuth</a>
          <a href="/counter">Counter</a>
        </div>
        <div className="logo-wrap">Z</div>
        <h1>zkAuth</h1>
        <p className="subtitle">
          Private identity on Stellar.<br />
          Shield your address with zero-knowledge proofs.
        </p>
        <ZkAuthButton />
        <BalanceDisplay />
      </div>
    </div>
  );
}
