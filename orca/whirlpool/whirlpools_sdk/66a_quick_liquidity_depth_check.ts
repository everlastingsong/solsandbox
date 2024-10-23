import { WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient, swapQuoteByInputToken, swapQuoteWithParams, SwapUtils, PriceMath, IGNORE_CACHE, NO_TOKEN_EXTENSION_CONTEXT, WhirlpoolData, SwapQuote } from "@orca-so/whirlpools-sdk";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { Percentage, DecimalUtil } from "@orca-so/common-sdk";
import Decimal from "decimal.js";
import BN from "bn.js";

async function main() {
  // bash$ export ANCHOR_PROVIDER_URL=<RPC>
  // bash$ export ANCHOR_WALLET=~/.config/solana/id.json
  // const provider = AnchorProvider.env();

  // setup client
  const provider = AnchorProvider.env();

  console.log("connection endpoint", provider.connection.rpcEndpoint);
  console.log("wallet", provider.wallet.publicKey.toBase58());

  const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
  const fetcher = ctx.fetcher;

  // 5% is too large for ts=2, ts=1 pools (single swap cannot move the price 5%)
  //const SOL_USDC_1 = new PublicKey("83v8iPyZihDEjDdY8RdZddyZNyUtXngz69Lgo9Kt5d6d");
  //const SOL_USDC_2 = new PublicKey("FpCMFDFGYotvufJ7HrFHsWEiiQCGbkLCtwHiDnh7o28Q");
  const SOL_USDC_4 = new PublicKey("Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE");
  const SOL_USDC_16 = new PublicKey("21gTfxAnhUDjJGZJDkTXctGFKT8TeiXx6pN1CEg9K1uW");
  const SOL_USDC_64 = new PublicKey("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ");

  const targetPoolPubkey = SOL_USDC_64;

  const targetPoolData = await fetcher.getPool(targetPoolPubkey, IGNORE_CACHE);
  const mints = await fetcher.getMintInfos([targetPoolData.tokenMintA, targetPoolData.tokenMintB], IGNORE_CACHE);
  const decimalsA = mints.get(targetPoolData.tokenMintA.toBase58()).decimals;
  const decimalsB = mints.get(targetPoolData.tokenMintB.toBase58()).decimals;

  const price = PriceMath.sqrtPriceX64ToPrice(targetPoolData.sqrtPrice, decimalsA, decimalsB);
  console.log("current price", price.toSignificantDigits(6));

  const pricePlus5pct = price.mul(1.05);
  const priceMinus5pct = price.mul(0.95);
  console.log("finding -5% ~ 5% liquidity depth", priceMinus5pct.toSignificantDigits(6), " ~ ", pricePlus5pct.toSignificantDigits(6));

  const sqrtPricePlus5pct = PriceMath.priceToSqrtPriceX64(pricePlus5pct, decimalsA, decimalsB);
  const swapQuotePlus5pct = await swapQuoteWithSqrtPriceLimit(
    ctx,
    targetPoolPubkey,
    targetPoolData,
    false, // b to a
    sqrtPricePlus5pct, // +5% (price up)
  );
  printQuote("+5%", swapQuotePlus5pct, decimalsA, decimalsB);

  const sqrtPriceMinus5pct = PriceMath.priceToSqrtPriceX64(priceMinus5pct, decimalsA, decimalsB);
  const swapQuoteMinus5pct = await swapQuoteWithSqrtPriceLimit(
    ctx,
    targetPoolPubkey,
    targetPoolData,
    true, // a to b
    sqrtPriceMinus5pct, // -5% (price down)
  );
  printQuote("-5%", swapQuoteMinus5pct, decimalsA, decimalsB);
}

main();

async function swapQuoteWithSqrtPriceLimit(
  ctx: WhirlpoolContext,
  whirlpoolAddress: PublicKey,
  whirlpoolData: WhirlpoolData,
  aToB: boolean,
  sqrtPriceLimit: BN,
) {
  const ZERO = new BN(0);
  const U64_MAX = new BN(2).pow(new BN(64)).subn(1);
  const NO_SLIPPAGE_TOLERANCE = Percentage.fromFraction(0, 1000);

  const tickArrays = await SwapUtils.getTickArrays(
    whirlpoolData.tickCurrentIndex,
    whirlpoolData.tickSpacing,
    aToB,
    ctx.program.programId,
    whirlpoolAddress,
    ctx.fetcher,
    IGNORE_CACHE,
  );

  try {
    return swapQuoteWithParams({
      whirlpoolData,
      aToB,
      amountSpecifiedIsInput: true,
      tokenAmount: U64_MAX,
      sqrtPriceLimit,
      otherAmountThreshold: ZERO,
      tokenExtensionCtx: NO_TOKEN_EXTENSION_CONTEXT,
      tickArrays,
    }, NO_SLIPPAGE_TOLERANCE);
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

function printQuote(label: string, quote: SwapQuote | undefined, decimalsA: number, decimalsB: number) {
  console.log(`quote for ${label}`);
  if (quote === undefined) {
    console.log(`  no quote`);
    return;
  }

  const [decimalsIn, decimalsOut] = quote.aToB ? [decimalsA, decimalsB] : [decimalsB, decimalsA];
  const amountIn = DecimalUtil.fromBN(quote.estimatedAmountIn, decimalsIn);
  const amountOut = DecimalUtil.fromBN(quote.estimatedAmountOut, decimalsOut);

  console.log(`  required input amount: ${amountIn.toSignificantDigits(6)} ${quote.aToB ? "A" : "B"}`);
  console.log(`  estimated output amount: ${amountOut.toSignificantDigits(6)} ${quote.aToB ? "B" : "A"}`);
}
