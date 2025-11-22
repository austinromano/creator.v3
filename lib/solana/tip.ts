import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';

// Platform wallet address - REPLACE THIS with your actual devnet wallet address
export const PLATFORM_WALLET = 'AGNTj3MU4BK1Aj2XqXRTdGFy4noUmt5wLVvAyzMnHPc4';

// Devnet RPC endpoint
export const DEVNET_RPC = 'https://api.devnet.solana.com';

// Fixed tip amount for MVP (0.01 SOL)
export const TIP_AMOUNT_SOL = 0.01;

/**
 * Send a tip from the connected wallet to the platform wallet on devnet
 * @param connection Solana connection instance
 * @param senderPublicKey Public key of the sender (viewer's wallet)
 * @param signTransaction Function to sign the transaction from wallet adapter
 * @param sendTransaction Function to send the transaction from wallet adapter
 * @returns Transaction signature
 */
export async function sendTip(
  connection: Connection,
  senderPublicKey: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>,
  sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>
): Promise<string> {
  try {
    // Validate platform wallet address
    if (PLATFORM_WALLET === 'REPLACE_WITH_YOUR_DEVNET_WALLET_ADDRESS') {
      throw new Error('Platform wallet address not configured. Please set PLATFORM_WALLET in lib/solana/tip.ts');
    }

    // Create platform wallet public key
    const platformPublicKey = new PublicKey(PLATFORM_WALLET);

    // Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
    const lamports = TIP_AMOUNT_SOL * LAMPORTS_PER_SOL;

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    // Create transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: senderPublicKey,
      toPubkey: platformPublicKey,
      lamports,
    });

    // Create transaction
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: senderPublicKey,
    }).add(transferInstruction);

    // Send transaction using wallet adapter
    const signature = await sendTransaction(transaction, connection);

    console.log('Tip transaction sent:', signature);
    console.log('View on Solana Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    if (confirmation.value.err) {
      throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
    }

    console.log('Tip transaction confirmed!');
    return signature;
  } catch (error) {
    console.error('Error sending tip:', error);
    throw error;
  }
}

/**
 * Get the Solana Explorer URL for a transaction
 */
export function getExplorerUrl(signature: string, cluster: 'devnet' | 'mainnet-beta' = 'devnet'): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}
