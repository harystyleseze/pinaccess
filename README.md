# PinAccess

A creator-focused web application that enables content creators to monetize private digital documents using Pinata's x402 payment protocol and private IPFS storage. Users pay with USDC on Base Sepolia to access gated content.

## Features

### For Creators
- Upload private documents (PDFs, images, ebooks) to IPFS via Pinata
- Create payment instructions with custom pricing in USD
- Attach multiple documents to a single payment instruction
- Manage and track monetized content from the admin dashboard
- View analytics on document access and revenue

### For Consumers
- Browse available monetized content
- Connect wallet (MetaMask, WalletConnect, Coinbase Wallet)
- Pay with USDC on Base Sepolia network
- Access purchased content instantly after payment

### Security
- Rate limiting for API endpoints (disabled in development)
- Input validation and sanitization
- Content security validation for uploads
- Secure wallet connection management

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **File Upload**: react-dropzone
- **Wallet**: wagmi + viem for Web3 wallet connections
- **Payments**: x402-fetch for x402 payment protocol
- **Storage**: Pinata Private IPFS
- **Network**: Base Sepolia (testnet)
- **Testing**: Vitest with fast-check for property-based testing

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Pinata account with API access
- MetaMask or compatible Web3 wallet
- Base Sepolia testnet USDC tokens (for testing payments)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/harystyleseze/pinaccess
   cd pinaccess
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your Pinata API credentials in `.env.local`:
   ```env
PINATA_JWT=your_pinata_jwt_token_here
PINATA_GATEWAY_URL=https://brown-voluntary-aardwolf-402.mypinata.cloud
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
   ```

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Lint code
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
src/
├── app/                              # Next.js App Router
│   ├── page.tsx                      # Landing page
│   ├── browse/                       # Public content browser
│   ├── how-it-works/                 # How it works page
│   ├── content/[cid]/                # Content access with payment gate
│   ├── admin/                        # Creator dashboard
│   │   ├── page.tsx                  # Dashboard overview
│   │   ├── upload/                   # Document upload
│   │   ├── analytics/                # Analytics & stats
│   │   └── payment-instructions/     # Payment instruction management
│   │       ├── page.tsx              # List all instructions
│   │       ├── create/               # Create new instruction
│   │       └── [id]/                 # View/edit instruction
│   └── api/                          # API routes
│       ├── documents/                # Document CRUD operations
│       ├── payment-instructions/     # Payment instruction endpoints
│       ├── upload/                   # File upload handler
│       └── content/[cid]/            # Content info & access
├── components/
│   ├── layout/
│   │   └── Navigation.tsx            # Main navigation bar
│   └── ui/
│       ├── AnalyticsChart.tsx        # Revenue/access charts
│       ├── AnalyticsWidget.tsx       # Dashboard stat widgets
│       ├── CIDManager.tsx            # Attach CIDs to payment instructions
│       ├── ContentViewer.tsx         # Display paid content
│       ├── DocumentCard.tsx          # Document preview card
│       ├── DocumentDetail.tsx        # Full document details
│       ├── DocumentList.tsx          # List of documents
│       ├── FileUpload.tsx            # Drag-and-drop uploader
│       ├── NetworkIndicator.tsx      # Current network display
│       ├── PaymentButton.tsx         # x402 payment trigger
│       ├── PaymentInstructionCard.tsx
│       ├── PaymentInstructionForm.tsx
│       ├── ThemeToggle.tsx           # Dark/light mode toggle
│       └── WalletConnector.tsx       # Wallet connection UI
└── lib/
    ├── content-access.ts             # Content access utilities
    ├── error-handling.ts             # Error handling utilities
    ├── gateway-config.ts             # Pinata gateway configuration
    ├── pinata.ts                     # Pinata API client
    ├── pricing.ts                    # USD/USDC conversion utilities
    ├── security.ts                   # Rate limiting & security
    ├── types.ts                      # TypeScript definitions
    ├── validation.ts                 # Input validation
    ├── wallet-config.ts              # Wagmi wallet configuration
    ├── wallet-context.tsx            # React wallet context
    ├── wallet.ts                     # Wallet connection manager
    └── x402-client.ts                # x402 payment client
```

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents` | GET | List all documents |
| `/api/documents/public` | GET | List public/monetized documents |
| `/api/upload` | POST | Upload new document to IPFS |
| `/api/payment-instructions` | GET | List payment instructions |
| `/api/payment-instructions` | POST | Create payment instruction |
| `/api/payment-instructions/[id]` | GET | Get payment instruction details |
| `/api/payment-instructions/[id]` | DELETE | Delete payment instruction |
| `/api/payment-instructions/[id]/attach` | POST | Attach CID to instruction |
| `/api/payment-instructions/[id]/detach` | POST | Detach CID from instruction |
| `/api/content/[cid]/info` | GET | Get content metadata & pricing |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PINATA_JWT` | Pinata API JWT token | Yes |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | For WalletConnect |
| `PINATA_API_URL` | Pinata API endpoint | No (default: `https://api.pinata.cloud`) |
| `PINATA_GATEWAY_URL` | Pinata gateway URL | No (uses configured gateway) |

## Payment Flow

1. **Content Discovery**: User browses available monetized content
2. **Payment Required**: Accessing paid content returns HTTP 402 with x402 payment details
3. **Wallet Connection**: User connects their Web3 wallet
4. **Payment**: User approves USDC transfer via the PaymentButton component
5. **Access Granted**: Payment proof is verified and content is displayed

## Wallet Support

- MetaMask (browser extension)
- WalletConnect (mobile wallets)
- Coinbase Wallet
- Injected providers

## Network Configuration

The application is configured for **Base Sepolia** testnet:
- Chain ID: 84532
- USDC Contract: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Block Explorer: https://sepolia.basescan.org

## Testing

Property-based testing with fast-check ensures correctness across edge cases:

```bash
# Run all tests
npm test

# Run specific test file
npm test src/test/project-configuration.test.ts

# Run tests with coverage
npm test -- --coverage

# Interactive test UI
npm run test:ui
```

## License

MIT License
