import Link from "next/link";
import Navigation from "@/components/layout/Navigation";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation />
      
      <div className="content-max-width section-padding">
        {/* Hero Section */}
        <section className="py-20 lg:py-32">
          <div className="text-center max-w-5xl mx-auto animate-fade-in">
            <div className="mb-8">
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 text-primary font-semibold text-sm border border-primary/20">
                🚀 Powered by IPFS & Crypto Payments
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
              Monetize Your
              <span className="bg-gradient-to-r from-primary via-accent to-purple-600 bg-clip-text text-transparent block mt-2">
                Digital Documents
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Upload PDFs, ebooks, and documents to secure IPFS storage. Set your price. 
              Share payment links. Get paid in USDC automatically—no accounts needed.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <Link href="/admin/upload" className="btn-primary text-lg px-8 py-4">
                🚀 Start Monetizing
              </Link>
              <Link href="/admin" className="btn-secondary text-lg px-8 py-4">
                📊 View Dashboard
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-70">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">P</span>
                </div>
                <span className="text-gray-600 font-semibold">Pinata IPFS</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">B</span>
                </div>
                <span className="text-gray-600 font-semibold">Base Sepolia</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">$</span>
                </div>
                <span className="text-gray-600 font-semibold">USDC Payments</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Three simple steps to start earning from your digital content
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <div className="card-gradient p-8 text-center animate-slide-up">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg">
                <svg className="w-10 h-10 text-white icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Upload & Store</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Securely upload your documents to private IPFS storage with Pinata's enterprise-grade infrastructure.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">PDF</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">EPUB</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">MOBI</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="card-gradient p-8 text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg">
                <svg className="w-10 h-10 text-white icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Set Your Price</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Configure pricing in USD and receive payments in USDC on Base Sepolia network. You control the value.
              </p>
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-4">
                <p className="text-green-800 font-semibold">$5.00 USD = 5,000,000 USDC</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="card-gradient p-8 text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg">
                <svg className="w-10 h-10 text-white icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Share & Earn</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Get a secure payment link that handles everything automatically. No accounts, no subscriptions needed.
              </p>
              <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl p-4">
                <p className="text-purple-800 font-semibold text-sm">gateway.mypinata.cloud/x402/...</p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
                Why Choose PinAccess?
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-5 h-5 text-white icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Platform Fees</h3>
                    <p className="text-gray-600">Keep 100% of your earnings. Payments go directly to your wallet.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-5 h-5 text-white icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure & Private</h3>
                    <p className="text-gray-600">Your content stays private until payment is made. Built on IPFS.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-5 h-5 text-white icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Payments</h3>
                    <p className="text-gray-600">Automatic USDC payments on Base Sepolia. No waiting periods.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl p-8 border border-primary/20">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm">
                    <span className="font-semibold">📄 My eBook.pdf</span>
                    <span className="text-green-600 font-bold">$25.00</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm">
                    <span className="font-semibold">📊 Business Plan.pdf</span>
                    <span className="text-green-600 font-bold">$50.00</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm">
                    <span className="font-semibold">🎨 Design Guide.epub</span>
                    <span className="text-green-600 font-bold">$15.00</span>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white text-center">
                    <p className="font-bold text-lg">Total Earnings: $90.00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="text-center bg-gradient-to-r from-primary to-accent rounded-3xl p-12 md:p-20 text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Start Earning?
            </h2>
            <p className="text-xl md:text-2xl mb-10 opacity-90 max-w-3xl mx-auto">
              Join creators who are already monetizing their digital content with PinAccess
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link href="/admin/upload" className="bg-white text-primary hover:bg-gray-100 btn-pill text-lg px-8 py-4 font-bold">
                🚀 Upload Your First Document
              </Link>
              <Link href="/admin" className="border-2 border-white text-white hover:bg-white hover:text-primary btn-pill text-lg px-8 py-4 font-bold">
                📊 Explore Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-gray-200 mt-20">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                PinAccess
              </span>
            </div>
            <p className="text-gray-600 mb-4">
              Monetize your digital documents with IPFS and crypto payments
            </p>
            <p className="text-sm text-gray-500">
              Built with ❤️ using Pinata IPFS, Base Sepolia, and USDC
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
