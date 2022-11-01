import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { MathUtil, DecimalUtil, Percentage } from "@orca-so/common-sdk";
import { WhirlpoolContext, buildWhirlpoolClient, PriceMath, ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG, PDAUtil, increaseLiquidityQuoteByInputToken } from "@orca-so/whirlpools-sdk";
import { Wallet } from "@project-serum/anchor";
import Decimal from "decimal.js"

const RPC_ENDPOINT_URL = "https://api.mainnet-beta.solana.com";

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL);
  console.log("connection endpoint", connection.rpcEndpoint);
  
  const dummy_wallet = new Wallet(Keypair.generate());
  const ctx = WhirlpoolContext.from(connection, dummy_wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const client = buildWhirlpoolClient(ctx);

  // tokens
  const SOL = {mint: new PublicKey("So11111111111111111111111111111111111111112"), decimals: 9};
  const USDC = {mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), decimals: 6};
  const ORCA = {mint: new PublicKey("orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE"), decimals: 6};
  const WBTC = {mint: new PublicKey("9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E"), decimals: 6};
  const WETH = {mint: new PublicKey("7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs"), decimals: 8};
  const MSOL = {mint: new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"), decimals: 9};
  const MNDE = {mint: new PublicKey("MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey"), decimals: 9};
  const SAMO = {mint: new PublicKey("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"), decimals: 9};
  const USDT = {mint: new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"), decimals: 6};
  const TICK_SPACING_STABLE = 1;
  const TICK_SPACING_STANDARD = 64;

  // pool select
  const token_a = SOL;
  const token_b = USDC;
  const tick_spacing = TICK_SPACING_STANDARD;

  // deposit range condition
  const lower_price = new Decimal("25");
  const upper_price = new Decimal("40");
  const lower_tick_index = PriceMath.priceToInitializableTickIndex(lower_price, token_a.decimals, token_b.decimals, tick_spacing);
  const upper_tick_index = PriceMath.priceToInitializableTickIndex(upper_price, token_a.decimals, token_b.decimals, tick_spacing);
  console.log(
    "Range:",
    "\n  Lower:", PriceMath.tickIndexToPrice(lower_tick_index, token_a.decimals, token_b.decimals).toFixed(token_b.decimals),
    "\n  Upper:", PriceMath.tickIndexToPrice(upper_tick_index, token_a.decimals, token_b.decimals).toFixed(token_b.decimals)
  );
  
  // get whirlpool
  const whirlpool_key = PDAUtil.getWhirlpool(
    ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG,
    token_a.mint, token_b.mint, tick_spacing).publicKey;
  const whirlpool = await client.getPool(whirlpool_key);

  // get sqrt prices
  const price = PriceMath.sqrtPriceX64ToPrice(whirlpool.getData().sqrtPrice, token_a.decimals, token_b.decimals).toNumber()
  const lower_sqrt_price = Math.sqrt(PriceMath.tickIndexToPrice(lower_tick_index, token_a.decimals, token_b.decimals).toNumber());
  const upper_sqrt_price = Math.sqrt(PriceMath.tickIndexToPrice(upper_tick_index, token_a.decimals, token_b.decimals).toNumber());
  const current_sqrt_price = Math.min(Math.max(lower_sqrt_price, Math.sqrt(price)), upper_sqrt_price);

  // calc ratio (L: liquidity)
  // deposit_a = L/current_sqrt_price - L/upper_sqrt_price
  // deposit_b = L*current_sqrt_price - L*lower_sqrt_price
  const deposit_a = 1/current_sqrt_price - 1/upper_sqrt_price;
  const deposit_b = current_sqrt_price - lower_sqrt_price;
  const deposit_a_value_in_b = deposit_a * price;
  const deposit_b_value_in_b = deposit_b;
  const total_value_in_b = deposit_a_value_in_b + deposit_b_value_in_b;

  const ratio_a = deposit_a_value_in_b / total_value_in_b * 100;
  const ratio_b = deposit_b_value_in_b / total_value_in_b * 100;

  const round_d1 = (n) => Math.round(n * 10)/10;
  console.log(
    "Deposit ratio:",
    "\n  SOL  deposit:", round_d1(ratio_a), "%",
    "\n  USDC deposit:", round_d1(ratio_b), "%"
  );
}

main();


/*
SAMPLE OUTPUT

$ ts-node src/78a_deposit_ratio.ts 
connection endpoint https://api.mainnet-beta.solana.com
Range: 
  Lower: 25.066682 
  Upper: 40.250237
Deposit ratio: 
  SOL  deposit: 42.2 % 
  USDC deposit: 57.8 %

*/