import Navigation from '@/components/layout/Navigation';
import Link from 'next/link';
import { AlertTriangle, Info } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navigation />

      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="content-max-width section-padding">
          <div className="py-12 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4">
              How PinAccess Works
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              Understanding the x402 payment protocol and how to access paid content
            </p>
          </div>
        </div>
      </div>

      <div className="content-max-width section-padding py-12">
        {/* For Buyers */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-8">For Content Buyers</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="card p-6 text-center">
              <div className="text-4xl font-bold text-[var(--brand-teal)] mb-4">1</div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Browse Content</h3>
              <p className="text-[var(--text-secondary)]">
                Discover premium digital content from creators. View pricing and descriptions before purchasing.
              </p>
            </div>

            <div className="card p-6 text-center">
              <div className="text-4xl font-bold text-[var(--success)] mb-4">2</div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Make Payment</h3>
              <p className="text-[var(--text-secondary)]">
                Pay securely with USDC on Base Sepolia network. The x402 protocol handles payment verification automatically.
              </p>
            </div>

            <div className="card p-6 text-center">
              <div className="text-4xl font-bold text-[var(--info)] mb-4">3</div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Access Content</h3>
              <p className="text-[var(--text-secondary)]">
                Download or view your purchased content immediately. Your payment proof grants permanent access.
              </p>
            </div>
          </div>

          <div className="p-6 bg-[var(--info-light)] border border-[var(--info)]/20 rounded-xl">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-[var(--info)] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-[var(--info)] mb-2">x402 Payment Protocol</h4>
                <p className="text-[var(--text-secondary)] text-sm mb-3">
                  PinAccess uses the x402 payment protocol, which enables secure, decentralized payments for digital content.
                </p>
                <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                  <li><strong>Decentralized:</strong> No intermediaries - payments go directly to creators</li>
                  <li><strong>Secure:</strong> Blockchain-based payment verification</li>
                  <li><strong>Transparent:</strong> All payment terms are clearly displayed upfront</li>
                  <li><strong>Instant:</strong> Access content immediately after payment confirmation</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* For Creators */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-8">For Content Creators</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="card p-6 text-center">
              <span className="text-2xl font-bold text-[var(--brand-teal)] mb-3 block">1.</span>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Upload</h3>
              <p className="text-[var(--text-secondary)] text-sm">Upload your digital content securely to IPFS via Pinata</p>
            </div>

            <div className="card p-6 text-center">
              <span className="text-2xl font-bold text-[var(--success)] mb-3 block">2.</span>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Price</h3>
              <p className="text-[var(--text-secondary)] text-sm">Set your price in USD, automatically converted to USDC</p>
            </div>

            <div className="card p-6 text-center">
              <span className="text-2xl font-bold text-[var(--info)] mb-3 block">3.</span>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Share</h3>
              <p className="text-[var(--text-secondary)] text-sm">Get a secure gateway URL to share with potential buyers</p>
            </div>

            <div className="card p-6 text-center">
              <span className="text-2xl font-bold text-[var(--warning)] mb-3 block">4.</span>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Earn</h3>
              <p className="text-[var(--text-secondary)] text-sm">Receive payments directly to your wallet - no platform fees</p>
            </div>
          </div>
        </section>

        {/* Technical Details */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-8">Technical Details</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Payment Flow</h3>
              <ol className="text-[var(--text-secondary)] space-y-2 text-sm">
                <li><strong>1. Request:</strong> Buyer requests content via gateway URL</li>
                <li><strong>2. 402 Response:</strong> Gateway returns payment requirements</li>
                <li><strong>3. Payment:</strong> Buyer sends USDC to creator&apos;s wallet</li>
                <li><strong>4. Verification:</strong> x402 protocol verifies payment on-chain</li>
                <li><strong>5. Access:</strong> Content is served with payment proof</li>
              </ol>
            </div>

            <div className="card p-6">
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Network & Tokens</h3>
              <div className="text-[var(--text-secondary)] space-y-2 text-sm">
                <p><strong>Network:</strong> Base Sepolia (Testnet)</p>
                <p><strong>Token:</strong> USDC (0x036CbD53842c5426634e7929541eC2318f3dCF7e)</p>
                <p><strong>Storage:</strong> Pinata (Private Network)</p>
                <p><strong>Protocol:</strong> x402 Payment Standard</p>
              </div>

              <div className="mt-4 p-3 status-warning rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-xs">
                    <strong>Note:</strong> Currently using Base Sepolia testnet.
                    Production version will use Base mainnet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Getting Started */}
        <section className="text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-6">Ready to Get Started?</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/browse" className="btn-primary btn-lg">
              Browse Content
            </Link>
            <Link href="/admin/upload" className="btn-secondary btn-lg">
              Upload Content
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
