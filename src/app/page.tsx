import Link from "next/link";
import Image from "next/image";
import Navigation from "@/components/layout/Navigation";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navigation />

      <div className="content-max-width section-padding">
        {/* Hero Section */}
        <section className="py-20 lg:py-32">
          <div className="text-center max-w-4xl mx-auto animate-fade-in">
            <div className="mb-6">
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-[var(--primary-light)] text-[var(--brand-teal)] font-medium text-sm">
                Powered by Pinata & x402
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--text-primary)] mb-6 leading-tight">
              Monetize Your{" "}
              <span className="text-gradient">Digital Content</span>
            </h1>

            <p className="text-lg sm:text-xl text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto leading-relaxed">
              Upload PDFs and documents to secure IPFS storage. Set your price in USD.
              Get paid in USDC tokens automatically—no accounts needed.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link href="/admin/upload" className="btn-primary btn-lg">
                Start Monetizing
              </Link>
              <Link href="/admin" className="btn-secondary btn-lg">
                View Dashboard
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-6 text-[var(--text-muted)] text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--brand-teal)]" />
                <span>Pinata IPFS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--brand-cyan)]" />
                <span>Base Sepolia</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
                <span>USDC Payments</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              How It Works
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              Three simple steps to start earning from your digital content
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="card p-8 text-center animate-slide-up">
              <div className="text-5xl font-bold text-gradient mb-4">1</div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Upload & Store</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">
                Securely upload your content to private Pinata storage with enterprise-grade infrastructure.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="badge badge-info">PDF</span>
                <span className="badge badge-info">EPUB</span>
                <span className="badge badge-info">MOBI</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="card p-8 text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="text-5xl font-bold text-gradient mb-4">2</div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Set Your Price</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">
                Configure pricing in USD and receive payments in USDC on Base network. You control the value.
              </p>
              <div className="p-3 rounded-lg bg-[var(--success-light)]">
                <p className="text-sm font-medium text-[var(--success)]">$5.00 USD = 5.000000 USDC</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="card p-8 text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="text-5xl font-bold text-gradient mb-4">3</div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Share & Earn</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">
                Get a secure payment link that handles everything automatically. No accounts or subscriptions.
              </p>
              <div className="p-3 rounded-lg bg-[var(--primary-light)]">
                <p className="text-sm font-medium text-[var(--brand-teal)] truncate">gateway.mypinata.cloud/x402/...</p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-8">
                Why Choose PinAccess?
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-[var(--success)] mt-2 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Platform Fees</h3>
                    <p className="text-[var(--text-secondary)] text-sm">Keep 100% of your earnings. Payments go directly to your wallet.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-[var(--brand-teal)] mt-2 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Secure & Private</h3>
                    <p className="text-[var(--text-secondary)] text-sm">Your content stays private until payment is made. Built on Pinata.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-[var(--brand-cyan)] mt-2 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Instant Payments</h3>
                    <p className="text-[var(--text-secondary)] text-sm">Automatic USDC payments on Base Sepolia. No waiting periods.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="card p-6 space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--surface-elevated)]">
                  <span className="font-medium text-[var(--text-primary)]">My eBook.pdf</span>
                  <span className="text-[var(--success)] font-semibold">$25.00</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--surface-elevated)]">
                  <span className="font-medium text-[var(--text-primary)]">Business Plan.pdf</span>
                  <span className="text-[var(--success)] font-semibold">$50.00</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--surface-elevated)]">
                  <span className="font-medium text-[var(--text-primary)]">Design Guide.epub</span>
                  <span className="text-[var(--success)] font-semibold">$15.00</span>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-r from-[var(--brand-teal)] to-[var(--brand-cyan)] text-center">
                  <p className="text-white font-bold">Total Earnings: $90.00</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="text-center card p-12 md:p-16 bg-gradient-to-br from-[var(--brand-teal)] to-[var(--brand-cyan)]">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Start Earning?
            </h2>
            <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
              Join creators who are already monetizing their digital content with PinAccess
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/admin/upload"
                className="btn-secondary bg-white text-[var(--brand-teal)] border-white hover:bg-white/90 btn-lg"
              >
                Upload Your First Document
              </Link>
              <Link
                href="/browse"
                className="btn-ghost text-white hover:bg-white/10 btn-lg"
              >
                Browse Content
              </Link>
            </div>
          </div>
        </section>

        {/* Content Types Section */}
        <section className="py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Discover Premium Content
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
              Browse high-quality digital content from creators around the world.
              Pay securely with crypto and access instantly.
            </p>
            <Link href="/browse" className="btn-primary">
              Browse Content Library
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6 text-center">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Research Papers</h3>
              <p className="text-sm text-[var(--text-secondary)]">Academic research, whitepapers, and technical documentation</p>
            </div>

            <div className="card p-6 text-center">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Digital Art</h3>
              <p className="text-sm text-[var(--text-secondary)]">High-resolution artwork, designs, and creative assets</p>
            </div>

            <div className="card p-6 text-center">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">E-books & Guides</h3>
              <p className="text-sm text-[var(--text-secondary)]">Educational content, tutorials, and comprehensive guides</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-[var(--border)] mt-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Image
                src="/logo.png"
                alt="PinAccess"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="text-xl font-bold text-gradient">
                PinAccess
              </span>
            </div>
            <p className="text-[var(--text-secondary)] text-sm mb-2">
              Monetize your digital content with IPFS and crypto payments
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Built with Pinata IPFS, Base Sepolia, and USDC
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
