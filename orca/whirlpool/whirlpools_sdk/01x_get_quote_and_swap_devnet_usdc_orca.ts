import { PublicKey } from "@solana/web3.js";
import {
    WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PDAUtil, swapQuoteByInputToken
} from "@orca-so/whirlpools-sdk";
import { AnchorProvider } from "@project-serum/anchor";
import { DecimalUtil, Percentage } from "@orca-so/common-sdk";
import Decimal from "decimal.js";

// TESTED WITH @orca-so/whirlpools-sdk@0.5.0

// THIS SCRIPT REQUIRES ENVIRON VARS!!!
// bash$ export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts

const ORCA_DEVNET_WHIRLPOOLS_CONFIG = new PublicKey("847gd7SckNwJetbjf22ktip9vAtKWPMY4ntdr6CdCsJj");
const SOL = {mint: new PublicKey("So11111111111111111111111111111111111111112"), decimals: 9};
const USDC_DEV = {mint: new PublicKey("EmXq3Ni9gfudTiyNKzzYvpnQqnJEMRw2ttnVXoJXjLo1"), decimals: 6};
const ORCA_DEV = {mint: new PublicKey("orcarKHSqC5CDDsGbho8GKvwExejWHxTqGzXgcewB9L"), decimals: 6};
const TICK_SPACING_STABLE = 1;
const TICK_SPACING_STANDARD = 64;

async function main() {
  const provider = AnchorProvider.env();
  console.log("connection endpoint", provider.connection.rpcEndpoint);
  console.log("wallet", provider.wallet.publicKey.toBase58());
  
  const ctx = WhirlpoolContext.from(provider.connection, provider.wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const client = buildWhirlpoolClient(ctx);

  // get pool
  const whirlpool_pubkey = PDAUtil.getWhirlpool(
    ORCA_WHIRLPOOL_PROGRAM_ID,
    ORCA_DEVNET_WHIRLPOOLS_CONFIG,
    ORCA_DEV.mint,
    USDC_DEV.mint,
    TICK_SPACING_STANDARD
  ).publicKey;
  console.log("whirlpool_pubkey", whirlpool_pubkey.toBase58());
  const whirlpool = await client.getPool(whirlpool_pubkey);

  // get swap quote
  const amount_in = new Decimal("0.0001" /* USDC_DEV */);
  const acceptable_slippage = Percentage.fromFraction(10, 1000) // 1.0% (10/1000)
  const quote = await swapQuoteByInputToken(
    whirlpool,
    USDC_DEV.mint, // input is USDC_DEV
    DecimalUtil.toU64(amount_in, USDC_DEV.decimals), // toU64
    acceptable_slippage,
    ctx.program.programId,
    ctx.fetcher,
    true // refresh
  );

  // print quote
  console.log("aToB", quote.aToB);
  console.log("estimatedAmountIn", DecimalUtil.fromU64(quote.estimatedAmountIn, USDC_DEV.decimals).toString(), "USDC_DEV");
  console.log("estimatedAmountOut", DecimalUtil.fromU64(quote.estimatedAmountOut, ORCA_DEV.decimals).toString(), "ORCA_DEV");

  // execute transaction
  const tx = await whirlpool.swap(quote);
  const signature = await tx.buildAndExecute();
  console.log("signature", signature);
  ctx.connection.confirmTransaction(signature, "confirmed");
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/01x_get_quote_and_swap_devnet_usdc_orca.ts 
connection endpoint https://api.devnet.solana.com
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
whirlpool_pubkey 7RPWpY1xPchStbz9ubVDkWd4MbegsmCc7CtLFisneVLB
aToB false
estimatedAmountIn 0.0001 USDC_DEV
estimatedAmountOut 0.000043 ORCA_DEV
signature 3fNtC3BUoguiqvrUrQaotBM5YEtBLi7qFKVtwR3ZX7KRM9y6rxFCxj5UBavcbGZZ5a38cD3vsQBhqeXmpL47KXRA

*/