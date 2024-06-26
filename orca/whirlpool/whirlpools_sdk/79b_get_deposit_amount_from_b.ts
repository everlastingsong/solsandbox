import { PublicKey, Connection } from "@solana/web3.js";
import { MathUtil, DecimalUtil } from "@orca-so/common-sdk";
import { AccountFetcher, PriceMath } from "@orca-so/whirlpools-sdk";
import {
  getLiquidityFromTokenA,
  getLiquidityFromTokenB,
  getTokenAFromLiquidity,
  getTokenBFromLiquidity
} from "@orca-so/whirlpools-sdk/dist/utils/position-util";
import { BN } from "@project-serum/anchor";
import { u64 } from "@solana/spl-token";
import Decimal from "decimal.js"

function get_amount_a_by_amount_b(current_sqrt_price: BN, lower_sqrt_price: BN, upper_sqrt_price: BN, amount_b: u64): u64 {
  // current <= lower       : null (Deposit for tokenA only, tokenB is 0 and cannot be calculated)
  // lower < current < upper: calculate...
  // current >= upper       : 0 (Deposit for tokenB only)
  if ( current_sqrt_price.lte(lower_sqrt_price) ) return null;
  if ( current_sqrt_price.gte(upper_sqrt_price) ) return new u64(0);

  const liquidity = getLiquidityFromTokenB(new BN(amount_b.toString()), lower_sqrt_price, current_sqrt_price, false);
  const amount_a = getTokenAFromLiquidity(liquidity, current_sqrt_price, upper_sqrt_price, true);

  return amount_a;
}

function get_amount_b_by_amount_a(current_sqrt_price: BN, lower_sqrt_price: BN, upper_sqrt_price: BN, amount_a: u64): u64 {
  // current <= lower       : 0 (Deposit for tokenA only)
  // lower < current < upper: calculate...
  // current >= upper       : null (Deposit for tokenB only, tokenA is 0 and cannot be calculated)
  if ( current_sqrt_price.lte(lower_sqrt_price) ) return new u64(0);
  if ( current_sqrt_price.gte(upper_sqrt_price) ) return null;

  const liquidity = getLiquidityFromTokenA(new BN(amount_a.toString()), current_sqrt_price, upper_sqrt_price, false);
  const amount_b = getTokenBFromLiquidity(liquidity, lower_sqrt_price, current_sqrt_price, true);

  return amount_b;
}

async function main() {
  const RPC_ENDPOINT_URL="https://solana-api.projectserum.com"
  const WHIRLPOOL_SOL_USDC_64 = new PublicKey("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ");
  const WHIRLPOOL_SOL_stSOL_1 = new PublicKey("2AEWSvUds1wsufnsDPCXjFsJCMJH5SNNm7fSF4kxys9a");

  // input
  const whirlpool_pubkey = WHIRLPOOL_SOL_USDC_64;
  const lower_price = new Decimal(20);
  const upper_price = new Decimal(40);
  const amount_b = DecimalUtil.toU64(new Decimal(100), 6 /* USDC decimal */);

  // setup
  const connection = new Connection(RPC_ENDPOINT_URL);
  const fetcher = new AccountFetcher(connection);

  // calc...
  const whirlpool = await fetcher.getPool(whirlpool_pubkey);
  const token_a = await fetcher.getMintInfo(whirlpool.tokenMintA);
  const token_b = await fetcher.getMintInfo(whirlpool.tokenMintB);
  const lower_index = PriceMath.priceToInitializableTickIndex(lower_price, token_a.decimals, token_b.decimals, whirlpool.tickSpacing);
  const upper_index = PriceMath.priceToInitializableTickIndex(upper_price, token_a.decimals, token_b.decimals, whirlpool.tickSpacing);
  const lower_sqrt_price = PriceMath.tickIndexToSqrtPriceX64(lower_index);
  const upper_sqrt_price = PriceMath.tickIndexToSqrtPriceX64(upper_index);
  const current_sqrt_price = whirlpool.sqrtPrice;

  const amount_a = get_amount_a_by_amount_b(current_sqrt_price, lower_sqrt_price, upper_sqrt_price, amount_b);

  // output
  console.log(`range [${lower_price.toString()}, ${upper_price.toString()}]`);
  console.log("current price", PriceMath.sqrtPriceX64ToPrice(current_sqrt_price, token_a.decimals, token_b.decimals));

  if ( amount_a === null ) {
    console.log(`deposit tokenA only (cannot calculate based on tokenB)`);
  } else {
    const ui_amount_a = DecimalUtil.fromU64(amount_a, token_a.decimals).toFixed(token_a.decimals);
    const ui_amount_b = DecimalUtil.fromU64(amount_b, token_b.decimals).toFixed(token_b.decimals);
    console.log(`deposit ${ui_amount_b} tokenB and ${ui_amount_a} tokenA`);  
  }
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/79b_get_deposit_amount_from_b.ts 
range [20, 40]
current price 29.26200323174046315661577829216372793727
deposit 100.000000 tokenB and 2.918943170 tokenA

ts-node src/79b_get_deposit_amount_from_b.ts 
range [35, 40]
current price 28.28993430592768419700447481882574362826
deposit tokenA only (cannot calculate based on tokenB)

$ ts-node src/79b_get_deposit_amount_from_b.ts 
range [20, 25]
current price 28.28993430592768419700447481882574362826
deposit 100.000000 tokenB and 0.000000000 tokenA

*/