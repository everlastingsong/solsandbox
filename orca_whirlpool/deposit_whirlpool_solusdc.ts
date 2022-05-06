import { OrcaWhirlpoolClient, OrcaNetwork, priceToTickIndex, tickIndexToPrice, Percentage } from "@orca-so/whirlpool-sdk";
import { solToken, usdcToken } from "@orca-so/sdk/dist/constants/tokens";
import Decimal from "decimal.js";
import { OrcaU64 } from "@orca-so/sdk";
import { BN } from "@project-serum/anchor";

function to_scaled(amount: BN, scale: number): string {
  const pow10 = new Decimal(10).pow(scale);
  return new Decimal(amount.toString()).div(pow10).toFixed(scale);
}

async function main() {
  // Derive the Whirlpool address from token mints
  const orca = new OrcaWhirlpoolClient({ network: OrcaNetwork.MAINNET });
  const poolAddress = await orca.pool.derivePDA(solToken.mint, usdcToken.mint, 64).publicKey;

  // Fetch an instance of the pool
  const poolData = await orca.getPool(poolAddress);
  if (!poolData) {
    return;
  }
  console.log("SOL price", poolData.price);

  // Open a position
  const openPositionQuote = await orca.pool.getOpenPositionQuote({
    poolAddress,
    tokenMint: solToken.mint,
    tokenAmount: OrcaU64.fromNumber(1, solToken.scale).toU64(), /* 1 SOL */
    refresh: true,
    tickLowerIndex: priceToTickIndex(new Decimal("70.0" /* USDC */), solToken.scale, usdcToken.scale),
    tickUpperIndex: priceToTickIndex(new Decimal("110.0" /* USDC */), solToken.scale, usdcToken.scale),
    slippageTolerance: Percentage.fromDecimal(new Decimal(0.1 /* % */))
  });

  console.log("poolAddress", openPositionQuote.poolAddress.toString());
  console.log("tickLowerIndex/Price", openPositionQuote.tickLowerIndex, tickIndexToPrice(openPositionQuote.tickLowerIndex, solToken.scale, usdcToken.scale));
  console.log("tickUpperIndex/Price", openPositionQuote.tickUpperIndex, tickIndexToPrice(openPositionQuote.tickUpperIndex, solToken.scale, usdcToken.scale));
  console.log("maxTokenA", to_scaled(openPositionQuote.maxTokenA, solToken.scale));
  console.log("maxTokenB", to_scaled(openPositionQuote.maxTokenB, usdcToken.scale));
  console.log("liquidity", openPositionQuote.liquidity.toString());
}

main();

/*

$ ts-node deposit_whirlpool_solusdc.ts 
SOL price 82.50683557935208429108157118044872666259
poolAddress HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
tickLowerIndex/Price -26594 69.99950986653027584273948810815130994229
tickUpperIndex/Price -22074 109.9983803534739919997737598162669928395
maxTokenA 1.001000000
maxTokenB 48.659219
liquidity 2144665164

*/
