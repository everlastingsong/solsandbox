import { WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient, swapQuoteByInputToken, swapQuoteWithParams, SwapUtils, PriceMath } from "@orca-so/whirlpools-sdk";
import { Wallet } from "@project-serum/anchor";
import { PublicKey, Connection, Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { Percentage, DecimalUtil, Instruction, TransactionBuilder } from "@orca-so/common-sdk";
import Decimal from "decimal.js";

const RPC = "https://api.mainnet-beta.solana.com";

// my clients //////////////////////////////////////////////////////////////////
import USER_WALLET_KEY from "../wallet-as-user.json";
import PLATFORM_WALLET_KEY from "../wallet-as-platform.json";
////////////////////////////////////////////////////////////////////////////////

class PubkeyWallet {
  constructor(private pubkey: PublicKey) {}
  get publicKey(): PublicKey { return this.pubkey }

  // This wallet cannot sign transaction because it doesn't have private key.
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]> { return null; /* no impl */ }
  signTransaction(tx: Transaction): Promise<Transaction> { return null; /* no impl */ }
}

async function platformSideProcess(userWalletPubkey: PublicKey): Promise<Buffer> {
  // platform side process uses keypair of platform's wallet and public key of the user.
  const platformWalletKeypair = Keypair.fromSecretKey(new Uint8Array(PLATFORM_WALLET_KEY));
  const platformWallet = new Wallet(platformWalletKeypair);
  
  const connection = new Connection(RPC, "confirmed");

  // this wallet doesn't contain private key
  const pubkeyUserWallet = new PubkeyWallet(userWalletPubkey);

  const ctx = WhirlpoolContext.from(connection, pubkeyUserWallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const client = buildWhirlpoolClient(ctx);

  const SOL_USDC_64 = new PublicKey("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ");
  const pool = await client.getPool(SOL_USDC_64);
  const sol = pool.getTokenAInfo();
  const usdc = pool.getTokenBInfo();

  // get Quote / input = 0.001 SOL
  const inputU64 = DecimalUtil.toU64(new Decimal("0.001"), sol.decimals);
  const aToB = true; // sol(A) to usdc(B)
  const acceptableSlippage = Percentage.fromFraction(1, 100); // 1%
  const quote = await swapQuoteByInputToken(
    pool,
    sol.mint,
    inputU64,
    acceptableSlippage,
    ctx.program.programId,
    ctx.fetcher,
    true
  );

  // Tx contains instructions to create/close WSOL token account
  const swapTx = await pool.swap(quote);

  // create rent flash loan instructions
  const rent = await ctx.fetcher.getAccountRentExempt();
  const borrowIx = SystemProgram.transfer({
    fromPubkey: platformWallet.publicKey,
    toPubkey: pubkeyUserWallet.publicKey,
    lamports: rent,
  });
  const repayIx = SystemProgram.transfer({
    fromPubkey: pubkeyUserWallet.publicKey,
    toPubkey: platformWallet.publicKey,
    lamports: rent,
  });
  const rentFlashLoanIx: Instruction = {
    instructions: [borrowIx],
    cleanupInstructions: [repayIx],
    signers: []
  };

  // construct Tx
  // payer = platformWallet
  const builder = new TransactionBuilder(ctx.connection, platformWallet);
  builder
    .addInstruction(rentFlashLoanIx)
    .addInstruction(swapTx.compressIx(false))

  // build Tx and partial sign
  // signers are temporary SOL account
  const { transaction, signers } = await builder.build();
  transaction.partialSign(platformWalletKeypair, ...signers);

  return transaction.serialize({requireAllSignatures: false});  
}


async function main() {
  // User side process
  const userWalletKeypair = Keypair.fromSecretKey(new Uint8Array(USER_WALLET_KEY));
  
  // setup client
  const connection = new Connection(RPC, "confirmed");

  // construct transaction at platform side
  // pass public key only to the platform
  const serializedTx = await platformSideProcess(userWalletKeypair.publicKey);
  const transaction = Transaction.from(serializedTx);

  // sign
  transaction.partialSign(userWalletKeypair);

  // send & confirm
  const signature = await connection.sendRawTransaction(transaction.serialize());
  console.log("signature", signature);  
  await connection.confirmTransaction(signature);
}

main();

/*

SAMPLE OUTPUT:

$ ts-node src/65b_rent_flash_loan_server_client.ts 
signature 3rerWyiV3JEuFRdDMePAPj7BVYAUMumH96SBEUzvxKqbdwNzVs2CxnmY9ewosan7CycEiiHurCnzENxfyy2ZDdis

*/
