// Core type definitions for PinAccess application

export interface Document {
  id: string;
  cid: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
  isMonetized: boolean;
  price?: {
    usd: number;
    usdc: string;
  };
  paymentInstructionId?: string;
  paymentInstructionName?: string;
  gatewayUrl?: string;
  walletAddress?: string;
  metadata: {
    creator: string;
    uploadTimestamp: string;
    status: 'uploaded' | 'monetized' | 'error';
    category?: string;
    description?: string;
  };
}

export interface PaymentInstruction {
  id: string;
  version: number; // Managed by Pinata
  name: string;
  description: string;
  paymentRequirements: PaymentRequirement[];
  createdAt: string;
  updatedAt?: string;
  attachedCIDCount?: number; // Calculated field
  totalEarnings?: string; // Future feature
}

export interface PaymentRequirement {
  asset: string; // USDC token address (0x036CbD53842c5426634e7929541eC2318f3dCF7e for Base Sepolia)
  pay_to: string; // Creator wallet address (Pinata API uses snake_case)
  network: 'base-sepolia';
  description: string;
  max_amount_required: string; // USDC amount in smallest unit (6 decimals) (Pinata API uses snake_case)
}

export interface AttachedCID {
  cid: string;
  documentName: string;
  fileSize: number;
  mimeType: string;
  uploadDate: string;
  gatewayUrl: string;
  paymentInstructionId: string;
}

export interface PaymentInstructionFormData {
  name: string;
  description: string;
  priceUSD: number;
  walletAddress: string;
  network: 'base-sepolia';
}

export interface UploadConfig {
  file: File;
  name: string;
  creator: string;
  category?: string;
  description?: string;
  monetization?: {
    mode: 'auto-create' | 'existing' | 'none';
    paymentInstructionId?: string; // For existing mode
    priceUSD?: number; // For auto-create mode
    walletAddress?: string; // For auto-create mode
  };
}

// API Response Types
export interface UploadResponse {
  success: boolean;
  data?: {
    id: string;
    cid: string;
    name: string;
    size: number;
    mimeType: string;
    paymentInstructionId?: string; // For auto-created instructions
    gatewayUrl?: string; // For auto-monetized uploads
  };
  error?: string;
}

export interface PaymentInstructionResponse {
  success: boolean;
  data?: PaymentInstruction;
  error?: string;
}

export interface PaymentInstructionListResponse {
  success: boolean;
  data?: {
    paymentInstructions: PaymentInstruction[];
    nextPageToken?: string;
    totalCount: number;
  };
  error?: string;
}

export interface CIDAttachmentResponse {
  success: boolean;
  data?: {
    cid: string;
    paymentInstructionId: string;
    gatewayUrl: string;
  };
  error?: string;
  isConflict?: boolean;
  requiresCidRemoval?: boolean;
}

export interface AttachedCIDsResponse {
  success: boolean;
  data?: {
    cids: AttachedCID[];
    paymentInstructionId: string;
  };
  error?: string;
}

export interface BulkCIDOperationResponse {
  success: boolean;
  data?: {
    successful: any[];
    failed: Array<{ cid: string; error: string }>;
    totalProcessed: number;
    successCount: number;
    errorCount: number;
  };
  error?: string;
}

export interface DocumentListResponse {
  success: boolean;
  data?: {
    documents: Document[];
    nextPageToken?: string;
    totalCount?: number;
  };
  error?: string;
}

// Component Props Types
export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedTypes: string[];
  maxSize: number;
  isUploading: boolean;
}

export interface PaymentInstructionCardProps {
  paymentInstruction: PaymentInstruction;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onViewDetails: (id: string) => void;
  attachedCIDCount: number;
}

export interface PaymentInstructionFormProps {
  initialData?: Partial<PaymentInstruction>;
  onSubmit: (data: PaymentInstructionFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
  mode: 'create' | 'edit';
}

export interface CIDManagerProps {
  paymentInstructionId: string;
  attachedCIDs: AttachedCID[];
  availableCIDs: Document[];
  onAttachCID: (cid: string) => void;
  onDetachCID: (cid: string) => void;
  onBulkAttach: (cids: string[]) => void;
}

export interface NetworkIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export interface DocumentCardProps {
  document: Document;
  onCopyUrl: (url: string) => void;
  onViewDetails: (id: string) => void;
  onAttachToPaymentInstruction?: (documentId: string) => void;
}

export interface PriceInputProps {
  onPriceChange: (usdAmount: number, usdcAmount: string) => void;
  onWalletChange: (address: string, isValid: boolean) => void;
  showTestnetWarning?: boolean;
}