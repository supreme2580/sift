'use client';

import { ZkPayButton } from '@/zkpay/button';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="app">
        <div className="logo-wrap">Z</div>
        <h1>zkPay</h1>
        <p className="subtitle">
          Private payments on Stellar.<br />
          Deposit XLM, withdraw anonymously with zero-knowledge proofs.
        </p>
        <ZkPayButton />
      </div>
    </div>
  );
}
