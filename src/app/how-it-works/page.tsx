import Navigation from '@/components/layout/Navigation';
import Link from 'next/link';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="content-max-width section-padding">
          <div className="py-12 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              How PinAccess Works
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Understanding the x402 payment protocol and how to access paid content
            </p>
          </div>
        </div>
      </div>

      <div className="content-max-width section-padding py-12">
        {/* For Buyers */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">For Content Buyers</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="card p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Browse Content</h3>
              <p className="text-gray-600">
                Discover premium digital content from creators. View pricing and descriptions before purchasing.
              </p>
            </div>
            
            <div className="card p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Make Payment</h3>
              <p className="text-gray-600">
                Pay securely with USDC on Base Sepolia network. The x402 protocol handles payment verification automatically.
              </p>
            </div>
            
            <div className="card p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Content</h3>
              <p className="text-gray-600">
                Download or view your purchased content immediately. Your payment proof grants permanent access.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h4 className="font-semibold text-blue-900 mb-2">🔒 x402 Payment Protocol</h4>
            <p className="text-blue-800 text-sm mb-3">
              PinAccess uses the x402 payment protocol, which enables secure, decentralized payments for digital content.
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Decentralized:</strong> No intermediaries - payments go directly to creators</li>
              <li>• <strong>Secure:</strong> Blockchain-based payment verification</li>
              <li>• <strong>Transparent:</strong> All payment terms are clearly displayed upfront</li>
              <li>• <strong>Instant:</strong> Access content immediately after payment confirmation</li>
            </ul>
          </div>
        </section>

        {/* For Creators */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">For Content Creators</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="card p-6 text-center">
              <div className="text-4xl mb-3">📤</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload</h3>
              <p className="text-gray-600 text-sm">Upload your digital content securely to IPFS via Pinata</p>
            </div>
            
            <div className="card p-6 text-center">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Price</h3>
              <p className="text-gray-600 text-sm">Set your price in USD, automatically converted to USDC</p>
            </div>
            
            <div className="card p-6 text-center">
              <div className="text-4xl mb-3">🔗</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Share</h3>
              <p className="text-gray-600 text-sm">Get a secure gateway URL to share with potential buyers</p>
            </div>
            
            <div className="card p-6 text-center">
              <div className="text-4xl mb-3">💸</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Earn</h3>
              <p className="text-gray-600 text-sm">Receive payments directly to your wallet - no platform fees</p>
            </div>
          </div>
        </section>

        {/* Technical Details */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Technical Details</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Payment Flow</h3>
              <ol className="text-gray-700 space-y-2 text-sm">
                <li><strong>1. Request:</strong> Buyer requests content via gateway URL</li>
                <li><strong>2. 402 Response:</strong> Gateway returns payment requirements</li>
                <li><strong>3. Payment:</strong> Buyer sends USDC to creator's wallet</li>
                <li><strong>4. Verification:</strong> x402 protocol verifies payment on-chain</li>
                <li><strong>5. Access:</strong> Content is served with payment proof</li>
              </ol>
            </div>
            
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Network & Tokens</h3>
              <div className="text-gray-700 space-y-2 text-sm">
                <p><strong>Network:</strong> Base Sepolia (Testnet)</p>
                <p><strong>Token:</strong> USDC (0x036CbD53842c5426634e7929541eC2318f3dCF7e)</p>
                <p><strong>Storage:</strong> IPFS via Pinata (Private Network)</p>
                <p><strong>Protocol:</strong> x402 Payment Standard</p>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> Currently using Base Sepolia testnet. 
                  Production version will use Base mainnet.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Getting Started */}
        <section className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Ready to Get Started?</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/browse" className="btn-primary px-8 py-3 text-lg">
              🔍 Browse Content
            </Link>
            <Link href="/admin/upload" className="btn-secondary px-8 py-3 text-lg">
              📤 Upload Content
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}