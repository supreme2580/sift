'use client';

import { ZkAuthButton } from '@supreme2580/zkauth';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="app">
        <div className="logo-wrap">Z</div>
        <h1>zkAuth</h1>
        <p className="subtitle">
          Private identity on Stellar.<br />
          Shield your address with zero-knowledge proofs.
        </p>
        <ZkAuthButton />
      </div>
    </div>
  );
}
