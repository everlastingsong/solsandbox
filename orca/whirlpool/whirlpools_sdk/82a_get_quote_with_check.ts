import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import {
    WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PDAUtil, ORCA_WHIRLPOOLS_CONFIG, swapQuoteByInputToken, swapQuoteWithParams, SwapUtils,
    TICK_ARRAY_SIZE, MIN_TICK_INDEX, MAX_TICK_INDEX, PriceMath, TickArray
} from "@orca-so/whirlpools-sdk";
import { Wallet, BN } from "@project-serum/anchor";
import { DecimalUtil, Percentage } from "@orca-so/common-sdk";
import Decimal from "decimal.js";

const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net";

// TOKEN & TICK_SPACING DEF
const SOL  = {symbol: "SOL",  mint: new PublicKey("So11111111111111111111111111111111111111112"),  decimals: 9};
const ORCA = {symbol: "ORCA", mint: new PublicKey("orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE"),  decimals: 6};
const WBTC = {symbol: "WBTC", mint: new PublicKey("9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E"), decimals: 6};
const WETH = {symbol: "WETH", mint: new PublicKey("7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs"), decimals: 8};
const MSOL = {symbol: "MSOL", mint: new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"),  decimals: 9};
const MNDE = {symbol: "MNDE", mint: new PublicKey("MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey"),  decimals: 9};
const SAMO = {symbol: "SAMO", mint: new PublicKey("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"), decimals: 9};
const USDC = {symbol: "USDC", mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), decimals: 6};
const USDT = {symbol: "USDT", mint: new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"), decimals: 6};
const JSOL = {symbol: "JSOL", mint: new PublicKey("7Q2afV64in6N6SeZsAAB81TJzwDoD6zpqmHkzi9Dcavn"), decimals: 9};
const TICK_SPACING_STABLE = 1;
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

  // INPUT
  const token_a = SOL;
  const token_b = USDC;
  const tick_spacing = TICK_SPACING_STANDARD;
  //const a_to_b = true;
  //const amount_in = new Decimal("1000000" /* SOL */);
  const a_to_b = false;
  const amount_in = new Decimal("10000000" /* USDC */);
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
}

main();

/*
SAMPLE OUTPUT

# [SOL/USDC] USDC --> SOL

$ ts-node src/82a_get_quote_with_check.ts 
whirlpool_key HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
aToB false
estimatedAmountIn 3298661.696496 USDC
estimatedAmountOut 83716.477722852 SOL
tickIndex change -33909 ---> -22592
price change 33.686856 ---> 104.445795
amountInUsed 3298661.696496 / 10000000 (32.986 %)

# [SOL/USDC] SOL --> USDC

$ ts-node src/82a_get_quote_with_check.ts 
whirlpool_key HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
aToB true
estimatedAmountIn 60372.505753539 SOL
estimatedAmountOut 1890234.071628 USDC
tickIndex change -33901 ---> -50689
price change 33.713183 ---> 6.291557
amountInUsed 60372.505753539 / 1000000 (6.037 %)

# [JSOL/USDC] USDC --> JSOL  (no liquidity)

$ ts-node src/82a_get_quote_with_check.ts 
whirlpool_key C27mQeymc9eB9du2GJkUf4wGYgdmHDzByZmc9AyLja2u
aToB false
estimatedAmountIn 0 USDC
estimatedAmountOut 0 JSOL
tickIndex change -28224 ---> -16960
price change 59.471451 ---> 183.431274
amountInUsed 0 / 10000000 (0.000 %)

*/