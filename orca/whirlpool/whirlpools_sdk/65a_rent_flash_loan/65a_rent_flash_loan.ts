import { WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient, swapQuoteByInputToken, swapQuoteWithParams, SwapUtils, PriceMath } from "@orca-so/whirlpools-sdk";
import { Wallet } from "@project-serum/anchor";
import { PublicKey, Connection, Keypair, SystemProgram } from "@solana/web3.js";
import { Percentage, DecimalUtil, Instruction, TransactionBuilder } from "@orca-so/common-sdk";
import Decimal from "decimal.js";

// my clients //////////////////////////////////////////////////////////////////
import USER_WALLET_KEY from "../wallet-as-user.json";
const userWalletKeypair = Keypair.fromSecretKey(new Uint8Array(USER_WALLET_KEY));
const userWallet = new Wallet(userWalletKeypair);

import PLATFORM_WALLET_KEY from "../wallet-as-platform.json";
const platformWalletKeypair = Keypair.fromSecretKey(new Uint8Array(PLATFORM_WALLET_KEY));
const platformWallet = new Wallet(platformWalletKeypair);
////////////////////////////////////////////////////////////////////////////////

async function main() {
  // setup client
  const RPC = "https://api.mainnet-beta.solana.com";
  const connection = new Connection(RPC, "confirmed");

  console.log("connection endpoint", connection.rpcEndpoint);
  console.log("userWallet", userWallet.publicKey.toBase58());
  console.log("platformWallet", platformWallet.publicKey.toBase58());

  const ctx = WhirlpoolContext.from(connection, userWallet, ORCA_WHIRLPOOL_PROGRAM_ID);
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
    toPubkey: userWallet.publicKey,
    lamports: rent,
  });
  const repayIx = SystemProgram.transfer({
    fromPubkey: userWallet.publicKey,
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
    // user need to sign
    .addSigner(userWalletKeypair)

  // send & confirm
  const signature = await builder.buildAndExecute();
  console.log("signature", signature);  
}

main();

/*

SAMPLE OUTPUT:

$ ts-node src/65a_rent_flash_loan.ts 
connection endpoint https://api.mainnet-beta.solana.com
userWallet 2v112XbwQXFrdqX438HUrfZF91qCZb7QRP4bwUiN7JF5
platformWallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
signature 2uL2bknaLW4WuML3BoRMP1Z4FV1q1ZUqAwDAqKoYvqqU2CeWwejCsHtmQhEjnBRHh3DZiUE45p1hpvKjaHnvuWuN

*/
