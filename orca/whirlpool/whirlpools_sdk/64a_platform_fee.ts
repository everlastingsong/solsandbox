import { WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient, swapQuoteByInputToken, swapQuoteWithParams, SwapUtils, PriceMath } from "@orca-so/whirlpools-sdk";
import { Wallet, AnchorProvider } from "@project-serum/anchor";
import { PublicKey, Connection, Keypair, SystemProgram } from "@solana/web3.js";
import { Percentage, DecimalUtil, Instruction, TransactionBuilder } from "@orca-so/common-sdk";
import Decimal from "decimal.js";

import PLATFORM_WALLET_KEY from "../wallet-as-platform.json";
////////////////////////////////////////////////////////////////////////////////

async function main() {
  const platformWallet = new PublicKey("2v112XbwQXFrdqX438HUrfZF91qCZb7QRP4bwUiN7JF5");
  const acceptableSlippage = Percentage.fromFraction(1, 100); // 1%

  // export ANCHOR_PROVIDER_URL=https://api.mainnet-beta.solana.com
  // export ANCHOR_WALLET=~/.config/solana/id.json

  const provider = AnchorProvider.env();
  const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
  const client = buildWhirlpoolClient(ctx);
  const userWallet = ctx.wallet;

  console.log("userWallet", userWallet.publicKey.toBase58());
  console.log("platformWallet", platformWallet.toBase58());

  const SOL_USDC_64 = new PublicKey("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ"); // 0.3% fee pool
  const pool = await client.getPool(SOL_USDC_64);
  const sol = pool.getTokenAInfo();
  const usdc = pool.getTokenBInfo();

  // get Quote / input = 0.001 SOL
  const totalInputU64 = DecimalUtil.toU64(new Decimal("0.001"), sol.decimals);
  const platformFeeU64 = totalInputU64.muln(0.01); // 1%
  const swapInputU64 = totalInputU64.sub(platformFeeU64);

  console.log(
    "totalInput", totalInputU64.toString(),
    "platformFee", platformFeeU64.toString(),
    "swapInput", swapInputU64.toString()
  );

  const quote = await swapQuoteByInputToken(
    pool,
    sol.mint,
    swapInputU64,
    acceptableSlippage,
    ctx.program.programId,
    ctx.fetcher,
    true
  );

  // Tx contains instructions to create/close WSOL token account
  const swapTx = await pool.swap(quote);

  const transferIx = SystemProgram.transfer({
    fromPubkey: userWallet.publicKey,
    toPubkey: platformWallet,
    lamports: platformFeeU64.toNumber(),
  });

  // construct Tx
  const builder = new TransactionBuilder(ctx.connection, userWallet);
  builder
    // transfer SOL to platform wallet
    .addInstruction({
      instructions: [transferIx],
      cleanupInstructions: [],
      signers: [],
    })
    // swap
    .addInstruction(swapTx.compressIx(false))

  // send & confirm
  const signature = await builder.buildAndExecute();
  console.log("signature", signature);  
}

main();

/*

SAMPLE OUTPUT:

$ ts-node src/64a_platform_fee.ts 
userWallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
platformWallet 2v112XbwQXFrdqX438HUrfZF91qCZb7QRP4bwUiN7JF5
totalInput 1000000 platformFee 10000 swapInput 990000
signature pSTw8Rnq4FG8kCsbcNUSsZjraSaCp8DqdppuTSXC96BQq4x8PcD2Rhe7UZj5AxQNo2vSgNmvVZNBWZzLEB3MG45

*/
