import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { BN, Wallet } from "@project-serum/anchor";
import {
  Whirlpool, TickArray, WhirlpoolContext, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID,
  PriceMath, increaseLiquidityQuoteByInputTokenWithParams, swapQuoteWithParams, SwapUtils, SwapQuote, IncreaseLiquidityQuote
} from "@orca-so/whirlpools-sdk";
import { DecimalUtil, Percentage } from "@orca-so/common-sdk";
import Decimal from "decimal.js";
import { u64 } from "@solana/spl-token";

function estimate(
  whirlpool: Whirlpool,
  tickarrays: TickArray[],
  lower_tick_index: number,
  upper_tick_index: number,
  convert_from_mint: PublicKey,
  convert_to_mint: PublicKey,
  convert_input: u64,
): { swap_quote: SwapQuote, deposit_quote: IncreaseLiquidityQuote } {
  const whirlpool_data = whirlpool.getData();
  const a_to_b = convert_from_mint.equals(whirlpool_data.tokenMintA);
  const ZERO_SLIPPAGE = Percentage.fromFraction(0, 100)

  // swap simulation
  const swap_quote = swapQuoteWithParams({
    tokenAmount: convert_input,
    amountSpecifiedIsInput: true,
    otherAmountThreshold: DecimalUtil.toU64(new Decimal("0")),
    sqrtPriceLimit: SwapUtils.getDefaultSqrtPriceLimit(a_to_b),
    tickArrays: tickarrays,
    aToB: a_to_b,
    whirlpoolData: whirlpool_data,
  }, ZERO_SLIPPAGE);
  const convert_output = swap_quote.estimatedAmountOut;

  // deposit calculation
  const deposit_quote = increaseLiquidityQuoteByInputTokenWithParams({
    tokenMintA: whirlpool_data.tokenMintA,
    tokenMintB: whirlpool_data.tokenMintB,
    sqrtPrice: whirlpool_data.sqrtPrice,
    tickCurrentIndex: whirlpool_data.tickCurrentIndex,
    tickLowerIndex: lower_tick_index,
    tickUpperIndex: upper_tick_index,
    inputTokenMint: convert_to_mint,
    inputTokenAmount: convert_output,
    slippageTolerance: ZERO_SLIPPAGE,
  });

  return { swap_quote, deposit_quote };
}


async function main() {
  // WhirlpoolClient 作成
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const dummy_wallet = new Wallet(Keypair.generate());
  const ctx = WhirlpoolContext.from(connection, dummy_wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const client = buildWhirlpoolClient(ctx);

  console.log("endpoint:", ctx.connection.rpcEndpoint);

  // get SOL/USDC whirlpool
  const SOL_USDC_WHIRLPOOL = new PublicKey("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ");
  const whirlpool = await client.getPool(SOL_USDC_WHIRLPOOL);
  const SOL = whirlpool.getTokenAInfo();
  const USDC = whirlpool.getTokenBInfo();
  const sqrt_price_x64 = whirlpool.getData().sqrtPrice;
  const price = PriceMath.sqrtPriceX64ToPrice(sqrt_price_x64, SOL.decimals, USDC.decimals);

  // range setting
  const lower_price = price.mul(new Decimal("0.9")); // -10%
  const upper_price = price.mul(new Decimal("1.1")); // +10%
  const lower_tick_index = PriceMath.priceToInitializableTickIndex(lower_price, SOL.decimals, USDC.decimals, whirlpool.getData().tickSpacing);
  const upper_tick_index = PriceMath.priceToInitializableTickIndex(upper_price, SOL.decimals, USDC.decimals, whirlpool.getData().tickSpacing);

  // input setting
  const convert_from = SOL;
  const convert_to = USDC;
  const convert_from_amount: BN = DecimalUtil.toU64(new Decimal("2"), SOL.decimals); // 2 SOL
  const a_to_b = convert_from.mint.equals(whirlpool.getData().tokenMintA);

  // get TickArray for swap simulation
  const tickarrays = await SwapUtils.getTickArrays(whirlpool.getData().tickCurrentIndex, whirlpool.getData().tickSpacing, a_to_b, ctx.program.programId, whirlpool.getAddress(), ctx.fetcher, true);

  // BINARY SEARCH
  const rate_denom = 10000;
  let rate = 1; // 0.01%
  let rate_ubound = rate_denom;
  console.log("SEARCH");
  while ( rate+1 < rate_ubound ) {
    const try_rate = rate + Math.floor((rate_ubound - rate) / 2);
    console.log("\trate, try_rate, rate_ubound:", rate, try_rate, rate_ubound);

    const convert_from_input = convert_from_amount.mul(new BN(try_rate)).div(new BN(rate_denom));
    const convert_from_depositable = convert_from_amount.sub(convert_from_input);
    const { deposit_quote } = estimate(whirlpool, tickarrays, lower_tick_index, upper_tick_index, convert_from.mint, convert_to.mint, convert_from_input);

    const convert_from_deposit: BN = a_to_b ? deposit_quote.tokenEstA : deposit_quote.tokenEstB;
    if ( convert_from_deposit.lt(convert_from_depositable) ) {
      rate = try_rate;
    } else {
      rate_ubound = try_rate;
    }
  }

  console.log("RESULT");
  console.log("\tinput:", DecimalUtil.fromU64(convert_from_amount, SOL.decimals), "SOL");
  console.log("\tprice:", price.toFixed(USDC.decimals));
  console.log("\trange:",
    PriceMath.tickIndexToPrice(lower_tick_index, SOL.decimals, USDC.decimals).toFixed(USDC.decimals),
    " - ",
    PriceMath.tickIndexToPrice(upper_tick_index, SOL.decimals, USDC.decimals).toFixed(USDC.decimals)
  );
  console.log("\tconvert rate:", rate / rate_denom * 100, "%");
  const convert_from_input = convert_from_amount.mul(new BN(rate)).div(new BN(rate_denom));
  const { swap_quote, deposit_quote } = estimate(whirlpool, tickarrays, lower_tick_index, upper_tick_index, convert_from.mint, convert_to.mint, convert_from_input);

  console.log("\tswap:",
    DecimalUtil.fromU64(swap_quote.estimatedAmountIn, convert_from.decimals), "SOL",
    "to",
    DecimalUtil.fromU64(swap_quote.estimatedAmountOut, convert_to.decimals), "USDC",
  );
  console.log("\tdeposit:",
    "liquidity", deposit_quote.liquidityAmount.toString(),
    "SOL", DecimalUtil.fromU64(deposit_quote.tokenEstA, SOL.decimals),
    "USDC", DecimalUtil.fromU64(deposit_quote.tokenEstB, USDC.decimals),
  );

  // swap & increase liquidity with slippage
}

main();

/*
SAMPLE OUTPUT:

$ts-node src/85a_autoswap_simulation.ts 
endpoint: https://api.mainnet-beta.solana.com
SEARCH
        rate, try_rate, rate_ubound: 1 5000 10000
        rate, try_rate, rate_ubound: 5000 7500 10000
        rate, try_rate, rate_ubound: 5000 6250 7500
        rate, try_rate, rate_ubound: 5000 5625 6250
        rate, try_rate, rate_ubound: 5000 5312 5625
        rate, try_rate, rate_ubound: 5000 5156 5312
        rate, try_rate, rate_ubound: 5000 5078 5156
        rate, try_rate, rate_ubound: 5000 5039 5078
        rate, try_rate, rate_ubound: 5000 5019 5039
        rate, try_rate, rate_ubound: 5019 5029 5039
        rate, try_rate, rate_ubound: 5019 5024 5029
        rate, try_rate, rate_ubound: 5024 5026 5029
        rate, try_rate, rate_ubound: 5024 5025 5026
RESULT
        input: 2 SOL
        price: 32.496423
        range: 29.415789  -  35.870730
        convert rate: 50.239999999999995 %
        swap: 1.0048 SOL to 32.587015 USDC
        deposit: liquidity 3721115509 SOL 0.99486365 USDC 32.587015

*/