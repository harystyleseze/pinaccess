# PinAccess

A creator-focused web application that enables content creators to monetize private digital documents using Pinata's x402 payment system and private IPFS storage.

## Features

- Upload private documents (PDFs, ebooks) to IPFS
- Set prices and payment addresses for document access
- Generate shareable payment-gated links
- Creator dashboard for document management
- Automatic USDC payments on Base Sepolia network

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **File Upload**: react-dropzone
- **Testing**: Vitest with fast-check for property-based testing
- **Storage**: Pinata Private IPFS
- **Payments**: Pinata x402 with USDC on Base Sepolia

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Pinata account with API access

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your Pinata API credentials in `.env.local`:
   ```
   PINATA_JWT=your_pinata_jwt_token_here
   ```

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Creator dashboard
│   ├── documents/         # Document management
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # UI components
│   └── layout/           # Layout components
├── lib/                  # Utilities and configurations
│   ├── pinata.ts         # Pinata API client
│   ├── pricing.ts        # USD/USDC conversion
│   ├── validation.ts     # Input validation
│   └── types.ts          # TypeScript definitions
└── test/                 # Test files
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PINATA_JWT` | Pinata API JWT token | Required |
| `PINATA_API_URL` | Pinata API endpoint | `https://api.pinata.cloud` |
| `PINATA_GATEWAY_URL` | Pinata gateway URL | `https://gateway.mypinata.cloud` |
| `USDC_TOKEN_ADDRESS` | USDC token address on Base Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| `NETWORK` | Blockchain network | `base-sepolia` |

## Testing

The project uses property-based testing with fast-check to ensure correctness across all inputs:

```bash
# Run all tests
npm test

# Run specific test file
npm test src/test/project-configuration.test.ts

# Run tests with UI
npm run test:ui
```

## License

MIT License