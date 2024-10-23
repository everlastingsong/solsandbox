import { WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient, swapQuoteByInputToken, swapQuoteWithParams, SwapUtils, PriceMath, IGNORE_CACHE, NO_TOKEN_EXTENSION_CONTEXT, WhirlpoolData, SwapQuote, TickUtil, PDAUtil, ParsableWhirlpool, ParsableTickArray, TickArrayData, TICK_ARRAY_SIZE, TickData, PoolUtil } from "@orca-so/whirlpools-sdk";
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

  const SOL_USDC_1 = new PublicKey("83v8iPyZihDEjDdY8RdZddyZNyUtXngz69Lgo9Kt5d6d");
  const SOL_USDC_2 = new PublicKey("FpCMFDFGYotvufJ7HrFHsWEiiQCGbkLCtwHiDnh7o28Q");
  const SOL_USDC_4 = new PublicKey("Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE");
  const SOL_USDC_16 = new PublicKey("21gTfxAnhUDjJGZJDkTXctGFKT8TeiXx6pN1CEg9K1uW");
  const SOL_USDC_64 = new PublicKey("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ");
  const SOL_USDC_SPLASH = new PublicKey("CWjGo5jkduSW5LN5rxgiQ18vGnJJEKWPCXkpJGxKSQTH")

  const targetPoolPubkey = SOL_USDC_2;

  const targetPoolData = await fetcher.getPool(targetPoolPubkey, IGNORE_CACHE);
  const mints = await fetcher.getMintInfos([targetPoolData.tokenMintA, targetPoolData.tokenMintB], IGNORE_CACHE);
  const decimalsA = mints.get(targetPoolData.tokenMintA.toBase58()).decimals;
  const decimalsB = mints.get(targetPoolData.tokenMintB.toBase58()).decimals;

  const price = PriceMath.sqrtPriceX64ToPrice(targetPoolData.sqrtPrice, decimalsA, decimalsB);
  console.log("current price", price.toSignificantDigits(6));

  const pricePlus5pct = price.mul(1.05);
  const priceMinus5pct = price.mul(0.95);
  console.log("finding -5% ~ 5% liquidity depth", priceMinus5pct.toSignificantDigits(6), " ~ ", pricePlus5pct.toSignificantDigits(6));

  const liquidityDistribution = await getLiquidityDistribution(ctx, targetPoolPubkey, targetPoolData);

  const sqrtPriceMinus5pct = PriceMath.priceToSqrtPriceX64(priceMinus5pct, decimalsA, decimalsB);
  const sqrtPricePlus5pct = PriceMath.priceToSqrtPriceX64(pricePlus5pct, decimalsA, decimalsB);

  // price up direction depth
  let upAmountA = new BN(0);
  let upAmountB = new BN(0);
  {
    let liquidity = new BN(0);
    let sqrtPrice = targetPoolData.sqrtPrice;
    for (let i=0; i<liquidityDistribution.length; i++) {
      const ldi = liquidityDistribution[i];
      if (!TickUtil.checkTickInBounds(ldi.tickIndex)) continue;

      const nextSqrtPrice = PriceMath.tickIndexToSqrtPriceX64(ldi.tickIndex);

      if (nextSqrtPrice.gte(sqrtPrice)) {
        const lower = sqrtPrice;
        const upper = BN.min(nextSqrtPrice, sqrtPricePlus5pct);
        const deltaA = PoolUtil.getTokenAmountsFromLiquidity(liquidity, lower, lower, upper, false);
        const deltaB = PoolUtil.getTokenAmountsFromLiquidity(liquidity, upper, lower, upper, false);
        upAmountA = upAmountA.add(deltaA.tokenA);
        upAmountB = upAmountB.add(deltaB.tokenB);
        sqrtPrice = nextSqrtPrice;
      }
      liquidity = ldi.liquidity;

      if (nextSqrtPrice.gte(sqrtPricePlus5pct)) break;
    }
  }

  // price down direction depth
  let downAmountB = new BN(0);
  let downAmountA = new BN(0);
  {
    let liquidity = new BN(0);
    let sqrtPrice = targetPoolData.sqrtPrice;
    for (let i=liquidityDistribution.length - 1; i >= 0; i--) {
      const ldi = liquidityDistribution[i];
      if (!TickUtil.checkTickInBounds(ldi.tickIndex)) continue;

      const prevSqrtPrice = PriceMath.tickIndexToSqrtPriceX64(ldi.tickIndex);

      liquidity = ldi.liquidity;
      if (prevSqrtPrice.lte(sqrtPrice)) {
        const lower = BN.max(prevSqrtPrice, sqrtPriceMinus5pct);
        const upper = sqrtPrice;
        const deltaB = PoolUtil.getTokenAmountsFromLiquidity(liquidity, upper, lower, upper, false);
        const deltaA = PoolUtil.getTokenAmountsFromLiquidity(liquidity, lower, lower, upper, false);
        downAmountB = downAmountB.add(deltaB.tokenB);
        downAmountA = downAmountA.add(deltaA.tokenA);
        sqrtPrice = prevSqrtPrice;
      }

      if (prevSqrtPrice.lte(sqrtPriceMinus5pct)) break;
    }
  }

  console.log("current ~ +5%",
    "listed A", DecimalUtil.fromBN(upAmountA, decimalsA).toSignificantDigits(6),
    "required B (without fee)", DecimalUtil.fromBN(upAmountB, decimalsB).toSignificantDigits(6)
  );
  console.log("-5% ~ current",
    "listed B", DecimalUtil.fromBN(downAmountB, decimalsB).toSignificantDigits(6),
    "required A (without fee)", DecimalUtil.fromBN(downAmountA, decimalsA).toSignificantDigits(6)
  );
}

async function getLiquidityDistribution(
  ctx: WhirlpoolContext,
  poolAddress: PublicKey,
  poolData: WhirlpoolData,
) {
  const ZERO = new BN(0);
  const UNINITIALIZED_TICK_ARRAY_DATA: TickArrayData = {
    whirlpool: poolAddress,
    startTickIndex: 0, // must be overwrite
    ticks: new Array(TICK_ARRAY_SIZE).fill({
      initialized: false,
      liquidityGross: ZERO,
      liquidityNet: ZERO,
      feeGrowthOutsideA: ZERO,
      feeGrowthOutsideB: ZERO,
      rewardGrowthsOutside: [ZERO, ZERO, ZERO],
    } as TickData),
  };

  const tickSpacing = poolData.tickSpacing;

  // get tickarray pubkeys
  // -10 to +10 tickarrays
  const TICKARRAY_LOWER_OFFSET = -10;
  const TICKARRAY_UPPER_OFFSET = +10;
  const startIndexes: number[] = [];
  const tickArrayPubkeys: PublicKey[] = [];
  for ( let offset=TICKARRAY_LOWER_OFFSET; offset<=TICKARRAY_UPPER_OFFSET; offset++ ) {
    try {
    const startTickIndex = TickUtil.getStartTickIndex(poolData.tickCurrentIndex, tickSpacing, offset);
    const pda = PDAUtil.getTickArrayFromTickIndex(startTickIndex, tickSpacing, poolAddress, ctx.program.programId);
    startIndexes.push(startTickIndex);
    tickArrayPubkeys.push(pda.publicKey);
    } catch (e) { /* ignore too small/too large startTickIndex */ }
  }

  // get Whirlpool + TickArray account by 1 RPC call (for consistency)
  const accounts = await ctx.connection.getMultipleAccountsInfo([
    poolAddress,
    ...tickArrayPubkeys,
  ]);

  const snapshotPoolData = ParsableWhirlpool.parse(poolAddress, accounts[0]);
  const snapshotTickArrayData = accounts.slice(1).map((a, i) => {
    return !!a
      ? ParsableTickArray.parse(tickArrayPubkeys[i], a)
      : { ...UNINITIALIZED_TICK_ARRAY_DATA, startIndexes: startIndexes[i] };
  });

  // sweep liquidity
  const currentInitializableTickIndex = Math.floor(snapshotPoolData.tickCurrentIndex / tickSpacing) * tickSpacing;
  const currentPoolLiquidity = snapshotPoolData.liquidity;
  const liquidityDistribution: {tickIndex: number; liquidity: BN}[] = [];
  let liquidity = new BN(0);
  let liquidityDifference: BN;
  for ( let ta=0; ta<snapshotTickArrayData.length; ta++ ) {
    const tickarray = snapshotTickArrayData[ta];

    for ( let i=0; i<TICK_ARRAY_SIZE; i++ ) {
      const tickIndex = startIndexes[ta] + i*tickSpacing;

      // move right (add liquidityNet)
      liquidity = liquidity.add(tickarray.ticks[i].liquidityNet);

      liquidityDistribution.push({tickIndex, liquidity});

      // difference due to liquidity in TickArrays not read
      if ( tickIndex === currentInitializableTickIndex ) {
        liquidityDifference = currentPoolLiquidity.sub(liquidity);
      }
    }
  }

  // adjust (liquidity in TickArray not read)
  for ( let i=0; i<liquidityDistribution.length; i++ ) {
    liquidityDistribution[i].liquidity = liquidityDistribution[i].liquidity.add(liquidityDifference);
  }

  return liquidityDistribution;
}

main();
