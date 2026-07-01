import { ZkPayProvider, ZkPayButton } from './zkpay/index.js';

export default function App() {
  return (
    <ZkPayProvider privyAppId="cmqcnrgfd00650dl2djjr7892">
      <div className="app">
        <div className="logo-wrap">Z</div>
        <h1>zkPay</h1>
        <p className="subtitle">
          Private payments on Stellar.<br />
          Deposit XLM, withdraw anonymously with zero-knowledge proofs.
        </p>
        <ZkPayButton />
      </div>
    </ZkPayProvider>
  );
}
