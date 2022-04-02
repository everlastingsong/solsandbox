import { OrcaWhirlpoolClient, OrcaNetwork, priceToTickIndex, tickIndexToPrice } from "@orca-so/whirlpool-sdk";
import { u64 } from "@solana/spl-token";
import { orcaToken, usdcToken } from "@orca-so/sdk/dist/constants/tokens";
import Decimal from "decimal.js";

async function main() {
  // Derive the Whirlpool address from token mints
  const orca = new OrcaWhirlpoolClient({ network: OrcaNetwork.MAINNET });
  const poolAddress = await orca.pool.derivePDA(orcaToken.mint, usdcToken.mint, false).publicKey;

  // Fetch an instance of the pool
  const poolData = await orca.getPool(poolAddress);
  if (!poolData) {
    return;
  }
  console.log("ORCA price", poolData.price);

  // Open a position
  const openPositionQuote = await orca.pool.getOpenPositionQuote({
    poolAddress,
    tokenMint: orcaToken.mint,
    tokenAmount: new u64(10_000_000) /* 10 ORCA */,
    refresh: true,
    tickLowerIndex: priceToTickIndex(new Decimal("1.1078" /* USDC */), 6, 6),
    tickUpperIndex: priceToTickIndex(new Decimal("4.3576" /* USDC */), 6, 6),
  });

  console.log("poolAddress", openPositionQuote.poolAddress.toString());
  console.log("tickLowerIndex/Price", openPositionQuote.tickLowerIndex, tickIndexToPrice(openPositionQuote.tickLowerIndex, orcaToken.scale, usdcToken.scale));
  console.log("tickUpperIndex/Price", openPositionQuote.tickUpperIndex, tickIndexToPrice(openPositionQuote.tickUpperIndex, orcaToken.scale, usdcToken.scale));
  console.log("maxTokenA", openPositionQuote.maxTokenA.toString());
  console.log("maxTokenB", openPositionQuote.maxTokenB.toString());
  console.log("liquidity", openPositionQuote.liquidity.toString());
}

main();

/*

$ ts-node src/deposit_whirlpool.ts 

ORCA price 2.470577543307420985841239580556035266078
poolAddress FSBDeuLQ19Hse2jzhHfDwTvEoeRWD7UKK4BM1zgbV7pY
tickLowerIndex/Price 1023 1.10771007103289032482677323461859087608
tickUpperIndex/Price 14719 4.357185885656937421024787297843325423258
maxTokenA 10010000
maxTokenB 33081310
liquidity 63636461

*/
