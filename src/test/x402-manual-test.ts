/**
 * Manual x402 Payment Test Script
 * 
 * This script can be used to manually test the x402 payment flow
 * with real Pinata gateway URLs and payment requirements.
 */

import { 
  x402PaymentClient,
  type PaymentInfo
} from '../lib/x402-client';
import { 
  contentAccessClient,
  type ContentInfo
} from '../lib/content-access';
import { BASE_SEPOLIA_USDC_ADDRESS } from '../lib/wallet-config';

/**
 * Test x402 payment flow with a real CID
 */
async function testX402PaymentFlow() {
  console.log('🧪 Testing x402 Payment Flow');
  console.log('================================');

  // Test CID (replace with actual CID from your Pinata account)
  const testCid = 'bafkreihvajece2u7gnp7vdmuyrpj5btogxedzssfr4auh3lje527h6rztu';
  const gatewayUrl = `https://gateway.mypinata.cloud/x402/cid/${testCid}`;

  console.log(`📄 Testing CID: ${testCid}`);
  console.log(`🌐 Gateway URL: ${gatewayUrl}`);

  try {
    // Step 1: Test initial request (should get 402)
    console.log('\n📡 Step 1: Making initial request...');
    const initialResponse = await fetch(gatewayUrl);
    
    console.log(`   Status: ${initialResponse.status} ${initialResponse.statusText}`);
    
    if (initialResponse.status === 402) {
      console.log('✅ Received 402 Payment Required (expected)');
      
      // Parse payment requirements
      const paymentRequirements = await initialResponse.json();
      console.log('💰 Payment Requirements:', JSON.stringify(paymentRequirements, null, 2));
      
      if (paymentRequirements.accepts && paymentRequirements.accepts.length > 0) {
        const paymentOption = paymentRequirements.accepts[0];
        
        console.log('\n📋 Payment Details:');
        console.log(`   Amount: ${paymentOption.maxAmountRequired} (smallest units)`);
        console.log(`   Pay To: ${paymentOption.payTo}`);
        console.log(`   Asset: ${paymentOption.asset}`);
        console.log(`   Network: ${paymentOption.network}`);
        
        // Step 2: Validate payment info structure
        console.log('\n🔍 Step 2: Validating payment info...');
        const paymentInfo: PaymentInfo = {
          amount: paymentOption.maxAmountRequired,
          recipient: paymentOption.payTo,
          network: 'base-sepolia',
          asset: BASE_SEPOLIA_USDC_ADDRESS,
          gatewayUrl: paymentOption.resource || gatewayUrl,
          description: `Payment for content ${testCid}`
        };
        
        const isValid = x402PaymentClient.validatePaymentInfo(paymentInfo);
        console.log(`   Payment info valid: ${isValid ? '✅' : '❌'}`);
        
        if (isValid) {
          console.log('✅ Payment info validation passed');
          
          // Step 3: Test payment proof generation (mock)
          console.log('\n🔐 Step 3: Testing payment proof generation...');
          const mockTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
          const mockWalletAddress = '0x1234567890123456789012345678901234567890';
          
          // Access private method for testing
          const client = new (x402PaymentClient.constructor as any)();
          const paymentProof = client.generatePaymentProof(
            mockTxHash,
            paymentOption,
            mockWalletAddress
          );
          
          console.log(`   Generated proof: ${paymentProof.substring(0, 50)}...`);
          
          // Decode and verify proof structure
          const proofBase64 = paymentProof.replace('x402_proof_v1_', '');
          const proofJson = atob(proofBase64);
          const proofData = JSON.parse(proofJson);
          
          console.log('   Proof structure:', JSON.stringify(proofData, null, 2));
          console.log('✅ Payment proof generation successful');
          
          // Step 4: Test payment proof validation
          console.log('\n✅ Step 4: Testing payment proof validation...');
          const validation = await contentAccessClient.validatePaymentProof(
            testCid,
            paymentProof,
            gatewayUrl
          );
          
          console.log(`   Validation result: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
          if (!validation.isValid) {
            console.log(`   Error: ${validation.error}`);
            console.log(`   Expired: ${validation.isExpired}`);
          }
          
        } else {
          console.log('❌ Payment info validation failed');
        }
        
      } else {
        console.log('❌ Invalid payment requirements: missing accepts array');
      }
      
    } else if (initialResponse.ok) {
      console.log('ℹ️  Content is accessible without payment');
      const contentType = initialResponse.headers.get('content-type');
      console.log(`   Content-Type: ${contentType}`);
      
    } else {
      console.log(`❌ Unexpected response: ${initialResponse.status} ${initialResponse.statusText}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * Test content access utilities
 */
async function testContentAccessUtilities() {
  console.log('\n🛠️  Testing Content Access Utilities');
  console.log('=====================================');

  const mockContentInfo: ContentInfo = {
    cid: 'bafkreihvajece2u7gnp7vdmuyrpj5btogxedzssfr4auh3lje527h6rztu',
    name: 'Test Document.pdf',
    mimeType: 'application/pdf',
    size: 1024000,
    description: 'A test document',
    creator: 'Test Creator',
    price: {
      usd: 0.01,
      usdc: '10000'
    }
  };

  console.log('📄 Content Info:', JSON.stringify(mockContentInfo, null, 2));
  
  // Test utility functions
  console.log('\n🔧 Testing utility functions:');
  console.log(`   Icon: ${contentAccessClient.getContentIcon(mockContentInfo.mimeType)}`);
  console.log(`   Category: ${contentAccessClient.getContentCategory(mockContentInfo.mimeType)}`);
  console.log(`   File Size: ${contentAccessClient.formatFileSize(mockContentInfo.size)}`);
  console.log(`   Can Display Inline: ${contentAccessClient.canDisplayInline(mockContentInfo.mimeType)}`);
  
  // Test payment storage
  console.log('\n💾 Testing payment storage:');
  const mockWalletAddress = '0x1234567890123456789012345678901234567890';
  const paymentRecord = {
    cid: mockContentInfo.cid,
    paymentProof: 'test_proof_123',
    transactionHash: '0xmocktxhash',
    paidAt: new Date().toISOString(),
    walletAddress: mockWalletAddress,
    amount: '10000'
  };
  
  contentAccessClient.storePaymentRecord(paymentRecord);
  const retrieved = contentAccessClient.hasUserPaid(mockContentInfo.cid, mockWalletAddress);
  
  console.log(`   Payment stored: ${retrieved ? '✅' : '❌'}`);
  if (retrieved) {
    console.log(`   Retrieved: ${JSON.stringify(retrieved, null, 2)}`);
  }
  
  console.log('✅ Content access utilities test completed');
}

/**
 * Test address checksumming
 */
async function testAddressChecksumming() {
  console.log('\n🔐 Testing Address Checksumming');
  console.log('===============================');

  const testAddresses = [
    '0x742d35Cc6634C0532925a3b8D0C9C0E3C5C7C5C5', // Mixed case
    '0x742d35cc6634c0532925a3b8d0c9c0e3c5c7c5c5', // Lowercase
    '0x742D35CC6634C0532925A3B8D0C9C0E3C5C7C5C5'  // Uppercase
  ];

  try {
    const { getAddress } = await import('viem');
    
    for (const address of testAddresses) {
      console.log(`\n📍 Testing address: ${address}`);
      try {
        const checksummed = getAddress(address);
        console.log(`   Checksummed: ${checksummed}`);
        console.log('   ✅ Valid address');
      } catch (error) {
        console.log(`   ❌ Invalid address: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Address checksumming test failed:', error);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting x402 Manual Tests');
  console.log('==============================\n');

  await testX402PaymentFlow();
  await testContentAccessUtilities();
  await testAddressChecksumming();

  console.log('\n🎉 All manual tests completed!');
  console.log('===============================');
}

// Export for use in other test files or manual execution
export {
  testX402PaymentFlow,
  testContentAccessUtilities,
  testAddressChecksumming,
  runAllTests
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}