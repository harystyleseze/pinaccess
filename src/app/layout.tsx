import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/lib/wallet-context";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "PinAccess - Monetize Your Digital Content",
  description: "Upload, price, and monetize your digital documents with Pinata IPFS and x402 payment integration. Get paid in USDC tokens automatically.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${manrope.variable} font-sans antialiased`}>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
