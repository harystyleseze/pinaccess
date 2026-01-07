'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import ThemeToggle from '../ui/ThemeToggle'

export default function Navigation() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/browse', label: 'Browse' },
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/upload', label: 'Upload' },
    { href: '/admin/payment-instructions', label: 'Payments' },
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-[var(--surface)]/80 backdrop-blur-nav border-b border-[var(--border)] sticky top-0 z-50">
      <div className="content-max-width section-padding">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="PinAccess"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <span className="text-xl font-bold text-gradient">
              PinAccess
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={isActive(item.href) ? 'nav-link-active' : 'nav-link'}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-full hover:bg-[var(--surface-elevated)] transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-[var(--text-primary)]" />
              ) : (
                <Menu className="w-5 h-5 text-[var(--text-primary)]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 animate-slide-down border-t border-[var(--border)]">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`${
                    isActive(item.href) ? 'nav-link-active' : 'nav-link'
                  } w-full`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
