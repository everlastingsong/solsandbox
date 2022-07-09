import { PublicKey } from "@solana/web3.js";
import {
    WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient, TokenAmounts,
    PDAUtil, ORCA_WHIRLPOOLS_CONFIG, WhirlpoolData, PoolUtil, swapQuoteByInputToken, WhirlpoolClient, PriceMath, decreaseLiquidityQuoteByLiquidity,
} from "@orca-so/whirlpools-sdk";
import { Provider } from "@project-serum/anchor";
import { DecimalUtil, Percentage, TokenUtil, MathUtil } from "@orca-so/common-sdk";
import Decimal from "decimal.js";
import { TOKEN_PROGRAM_ID, u64 } from "@solana/spl-token";
import assert from "assert";

// THIS SCRIPT REQUIRES ENVIRON VARS!!!
// bash$ export ANCHOR_PROVIDER_URL=https://ssc-dao.genesysgo.net
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts

const provider = Provider.env();
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());

function print_simulation(
  desc: string,
  liquidity: u64,
  lower_sqrt_price_x64: u64,
  upper_sqrt_price_x64: u64,
  price_sqrt_price_x64: u64,
  round_up: boolean,
  token_a_decimal: number,
  token_b_decimal: number,
) {
  // ATTENTION!!!
  // the price parameters of getTokenAmountsFromLiquidity must be "SqrtPriceX64"
  const amounts = PoolUtil.getTokenAmountsFromLiquidity(
    liquidity,
    price_sqrt_price_x64,
    lower_sqrt_price_x64,
    upper_sqrt_price_x64,
    round_up,
  );

  const price = PriceMath.sqrtPriceX64ToPrice(price_sqrt_price_x64, token_a_decimal, token_b_decimal);
  const token_a_amount = DecimalUtil.fromU64(amounts.tokenA, token_a_decimal);
  const token_b_amount = DecimalUtil.fromU64(amounts.tokenB, token_b_decimal);
  console.log(
    desc,
    "\n\tprice:", price.toFixed(token_b_decimal),
    "\n\ttoken A amount:", token_a_amount.toString(),
    "\n\ttoken B amount:", token_b_amount.toString(),
  );
}

async function main() {
  const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
  const fetcher = new AccountFetcher(ctx.connection);
  const client = buildWhirlpoolClient(ctx, fetcher);

  // use 06a_list_whirlpool_positions to find one of positions as sample.
  const MY_OWN_POSITION = new PublicKey("4bwWbT1xgPC1vC245XFcV4HKobc9Kxaau7yH6TGG7S5D");

  // get position
  const position = await client.getPosition(MY_OWN_POSITION);
  const data = await position.getData();
  const pool = await client.getPool(data.whirlpool);
  const token_a = pool.getTokenAInfo();
  const token_b = pool.getTokenBInfo();

  const liquidity = data.liquidity;
  const lower_sqrt_price_x64 = PriceMath.tickIndexToSqrtPriceX64(data.tickLowerIndex);
  const upper_sqrt_price_x64 = PriceMath.tickIndexToSqrtPriceX64(data.tickUpperIndex);

  // simulation condition
  const current_sqrt_price_x64 = pool.getData().sqrtPrice;
  const in_range_sqrt_price_x64 = PriceMath.tickIndexToSqrtPriceX64(Math.floor((data.tickUpperIndex + data.tickLowerIndex)/2));
  const out_range_lower_sqrt_price_x64 = PriceMath.tickIndexToSqrtPriceX64(data.tickLowerIndex);
  const out_range_upper_sqrt_price_x64 = PriceMath.tickIndexToSqrtPriceX64(data.tickUpperIndex);

  print_simulation(
    "current",
    liquidity, lower_sqrt_price_x64, upper_sqrt_price_x64,
    current_sqrt_price_x64,
    true,
    token_a.decimals, token_b.decimals);

  print_simulation(
    "in_range",
    liquidity, lower_sqrt_price_x64, upper_sqrt_price_x64,
    in_range_sqrt_price_x64,
    true,
    token_a.decimals, token_b.decimals);

  print_simulation(
    "out_range_lower",
    liquidity, lower_sqrt_price_x64, upper_sqrt_price_x64,
    out_range_lower_sqrt_price_x64,
    true,
    token_a.decimals, token_b.decimals);

  print_simulation(
    "out_range_upper",
    liquidity, lower_sqrt_price_x64, upper_sqrt_price_x64,
    out_range_upper_sqrt_price_x64,
    true,
    token_a.decimals, token_b.decimals);  
}

main();

/*
SAMPLE OUTPUT

$ ts-node 07a_simulate_position_balance_change.ts 
connection endpoint https://ssc-dao.genesysgo.net
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
current 
        price: 44.063496 
        token A amount: 0.011765761 
        token B amount: 0.377086
in_range 
        price: 50.194470 
        token A amount: 0.009569895 
        token B amount: 0.480356
out_range_lower 
        price: 25.066682 
        token A amount: 0.023112014 
        token B amount: 0
out_range_upper 
        price: 100.511299 
        token A amount: 0 
        token B amount: 1.160096
        
*/
