import { Keypair, Connection, PublicKey, Transaction } from "@solana/web3.js";
import { OrcaU64 } from '@orca-so/sdk';
import { resolveOrCreateAssociatedTokenAddress, TransactionBuilder } from '@orca-so/sdk/dist/public/utils/web3';
import { Owner } from '@orca-so/sdk/dist/public/utils/web3/key-utils';

const RPC_ENDPOINT_URL = "https://api.devnet.solana.com";
const WSOL = {mint: new PublicKey("So11111111111111111111111111111111111111112"), decimals: 9};

// wallet
const id_json_path = "wallet.json";
const secret = Uint8Array.from(JSON.parse(require("fs").readFileSync(id_json_path)));
const wallet = Keypair.fromSecretKey(secret as Uint8Array);

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");

  // Wrapped SOL amount
  const wrapped_lamports = 1_000_000_000; // 1 SOL

  // create WSOL account related instructions
  const create_wsol_token_account = await resolveOrCreateAssociatedTokenAddress(
    connection,
    new Owner(wallet),
    WSOL.mint,
    OrcaU64.fromNumber(wrapped_lamports).toU64()
  );

  const create_instructions = create_wsol_token_account.instructions;
  const delete_instructions = create_wsol_token_account.cleanupInstructions;
  const wsol_account_signers = create_wsol_token_account.signers; // WSOL account's keypair

  console.log("Wrapped SOL token account:", create_wsol_token_account.address.toBase58());
  console.log("Wrapped SOL(lamports):", wrapped_lamports);

  // build transaction
  // Step-by-step instructions are assembled.
  // Once understood, Orca's TransactionBuilder makes it easy.
  const transaction = new Transaction();
  transaction.add(...create_instructions);
  // insert swap instruction using WSOL if needed
  transaction.add(...delete_instructions);

  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = (await connection.getRecentBlockhash("confirmed")).blockhash;
  transaction.partialSign(...wsol_account_signers);
  transaction.partialSign(wallet);

  const signature = await connection.sendRawTransaction(transaction.serialize());
  console.log("signature", signature);
  await connection.confirmTransaction(signature);
}

main();

/*

$ ts-node app/src/create_and_delete_wsol_account.ts 
Wrapped SOL token account: HQkh5VkWReJnmjevmaoXXZWYJ5oc1oSUhw3fMvwPSgAw
Wrapped SOL(lamports): 1000000000
signature 3HH8B7ZL1t7hkyja5CToUFtMVPcYxVdLbwrK3te7Rvje2PmgHd9WjjimwLTMc2WWs3Zdq3AgJEX99EW9htJfhFTg

https://solscan.io/tx/3HH8B7ZL1t7hkyja5CToUFtMVPcYxVdLbwrK3te7Rvje2PmgHd9WjjimwLTMc2WWs3Zdq3AgJEX99EW9htJfhFTg?cluster=devnet

*/