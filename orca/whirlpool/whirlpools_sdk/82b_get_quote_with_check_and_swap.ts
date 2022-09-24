import { PublicKey, Connection, Keypair, ComputeBudgetProgram } from "@solana/web3.js";
import {
    WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PDAUtil, ORCA_WHIRLPOOLS_CONFIG, swapQuoteByInputToken, swapQuoteWithParams, SwapUtils,
    TICK_ARRAY_SIZE, MIN_TICK_INDEX, MAX_TICK_INDEX, PriceMath, TickArray
} from "@orca-so/whirlpools-sdk";
import { Wallet, BN } from "@project-serum/anchor";
import { DecimalUtil, Percentage } from "@orca-so/common-sdk";
import Decimal from "decimal.js";
import { TransactionBuilder } from "@orca-so/common-sdk";

////////////////////////////////////////////////////////////////////////////////
// local validator with cloned SOL/USDC whirlpool
////////////////////////////////////////////////////////////////////////////////
const RPC_ENDPOINT_URL = "http://localhost:18899";


// TOKEN & TICK_SPACING DEF
const SOL  = {symbol: "SOL",  mint: new PublicKey("So11111111111111111111111111111111111111112"),  decimals: 9};
const USDC = {symbol: "USDC", mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), decimals: 6};
const TICK_SPACING_STANDARD = 64;

function get_sqrt_price_safe_limit(tickarrays: TickArray[], a_to_b: boolean, tick_spacing: number): BN {
  const last_tickarray = tickarrays[2] ?? tickarrays[1] ?? tickarrays[0];
  const last_tick_index = a_to_b
    ? last_tickarray.data.startTickIndex
    : last_tickarray.data.startTickIndex + tick_spacing * (TICK_ARRAY_SIZE - 1);
  const bound_last_tick_index = Math.min(MAX_TICK_INDEX, Math.max(MIN_TICK_INDEX, last_tick_index));

  return PriceMath.tickIndexToSqrtPriceX64(bound_last_tick_index);
}

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");
  const dummy_wallet = new Wallet(Keypair.generate());
  const ctx = WhirlpoolContext.from(connection, dummy_wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const fetcher = new AccountFetcher(ctx.connection);
  const client = buildWhirlpoolClient(ctx);

  const airdrop_signature = await ctx.connection.requestAirdrop(dummy_wallet.publicKey, 800000 * 10**9);
  console.log("aidrop signature", airdrop_signature);
  await ctx.connection.confirmTransaction(airdrop_signature, "confirmed");

  // INPUT
  const token_a = SOL;
  const token_b = USDC;
  const tick_spacing = TICK_SPACING_STANDARD;
  const a_to_b = true;
  const amount_in = new Decimal("1000000" /* SOL */);
  const acceptable_slippage = Percentage.fromFraction(10, 1000) // 1.0%

  // get whirlpool
  const whirlpool_pubkey = PDAUtil.getWhirlpool(
    ORCA_WHIRLPOOL_PROGRAM_ID,
    ORCA_WHIRLPOOLS_CONFIG,
    token_a.mint, token_b.mint, tick_spacing
  ).publicKey;
  console.log("whirlpool_key", whirlpool_pubkey.toBase58());
  const whirlpool = await client.getPool(whirlpool_pubkey);

  // get swap quote
  const [input_token, output_token] = a_to_b ? [token_a, token_b] : [token_b, token_a];

  const tickarrays = await SwapUtils.getTickArrays(
    whirlpool.getData().tickCurrentIndex,
    tick_spacing,
    a_to_b,
    ctx.program.programId,
    whirlpool_pubkey,
    fetcher,
    true
  );

  // prevent TickArraySequenceInvalid(Swap input value traversed too many arrays) error
  const sqrt_price_safe_limit = get_sqrt_price_safe_limit(tickarrays, a_to_b, tick_spacing);

  const quote = await swapQuoteWithParams({
    amountSpecifiedIsInput: true,
    aToB: a_to_b,
    whirlpoolData: whirlpool.getData(),
    tokenAmount: DecimalUtil.toU64(amount_in, input_token.decimals),
    otherAmountThreshold: SwapUtils.getDefaultOtherAmountThreshold(true /* amountSpecifiedIsInput */),
    sqrtPriceLimit: sqrt_price_safe_limit,
    tickArrays: tickarrays,
  }, acceptable_slippage);

  // print quote
  console.log("aToB", quote.aToB);
  console.log("estimatedAmountIn", DecimalUtil.fromU64(quote.estimatedAmountIn, input_token.decimals).toString(), input_token.symbol);
  console.log("estimatedAmountOut", DecimalUtil.fromU64(quote.estimatedAmountOut, output_token.decimals).toString(), output_token.symbol);

  // print change tick & price
  console.log(
    "tickIndex change",
    whirlpool.getData().tickCurrentIndex,
    "--->",
    quote.estimatedEndTickIndex
  );
  console.log(
    "price change",
    PriceMath.sqrtPriceX64ToPrice(whirlpool.getData().sqrtPrice, token_a.decimals, token_b.decimals).toFixed(token_b.decimals),
    "--->",
    PriceMath.sqrtPriceX64ToPrice(quote.estimatedEndSqrtPrice, token_a.decimals, token_b.decimals).toFixed(token_b.decimals)
  );

  // print used rate
  const amount_in_used = DecimalUtil.fromU64(quote.estimatedAmountIn, input_token.decimals);
  const amount_in_used_rate = amount_in_used.div(amount_in).mul(100).toFixed(3);
  console.log("amountInUsed", amount_in_used, "/", amount_in, `(${amount_in_used_rate} %)`);

  // set estimated value as input
  quote.amount = quote.estimatedAmountIn;

  // build TX
  // large rage swap requires much ComputeUnit, so setComputeUnitLimit is used
  const compute_budget_ix = ComputeBudgetProgram.setComputeUnitLimit({units: 1_400_000});
  const swap_ix = await (await whirlpool.swap(quote)).build();

  const tx = new TransactionBuilder(connection, dummy_wallet)
  .addInstruction({
    instructions: [compute_budget_ix],
    cleanupInstructions: [],
    signers: []
  })
  .addInstruction({
    instructions: swap_ix.transaction.instructions,
    cleanupInstructions: [],
    signers: swap_ix.signers,
  });

  // execute transaction
  const signature = await tx.buildAndExecute();
  console.log("signature", signature);
  ctx.connection.confirmTransaction(signature, "confirmed");  
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/82b_get_quote_with_check_and_swap.ts 
aidrop signature kf4hGZbuHhMLAFg8Ps3dm6VKtjK1u4uBzno2dTyfCP2SDkuga3jXXYhPaxwVemVkkCGR61oKnuVa2q6zmzrPCbd
whirlpool_key HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
aToB true
estimatedAmountIn 48421.739821517 SOL
estimatedAmountOut 1741786.316042 USDC
tickIndex change -32101 ---> -45057
price change 40.362225 ---> 11.049448
amountInUsed 48421.739821517 / 1000000 (4.842 %)
signature 59b7P4fxA4TZXUphrLtS8SRs7EXs8DCiEhn1D2s8ZR8C25Tws2keRUV5Aakor1vCb7poBcHSA3bdqcvWdfzLytyU

*/