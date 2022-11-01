import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { MathUtil, DecimalUtil, Percentage } from "@orca-so/common-sdk";
import { WhirlpoolContext, buildWhirlpoolClient, AccountFetcher, PriceMath, ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG, PDAUtil, increaseLiquidityQuoteByInputToken } from "@orca-so/whirlpools-sdk";
import { BN, Wallet } from "@project-serum/anchor";
import { u64 } from "@solana/spl-token";
import Decimal from "decimal.js"
import fetch from 'node-fetch'; // npm install node-fetch@2 (v2)

const RPC_ENDPOINT_URL = "https://api.mainnet-beta.solana.com";
const ORCA_ENDPOINT_TOKEN = "https://api.mainnet.orca.so/v1/token/list";

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL);
  console.log("connection endpoint", connection.rpcEndpoint);
  
  const dummy_wallet = new Wallet(Keypair.generate());
  const ctx = WhirlpoolContext.from(connection, dummy_wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const fetcher = new AccountFetcher(ctx.connection);
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

  // deposit input
  const lower_price = new Decimal("25");
  const upper_price = new Decimal("40");
  const input_token = SOL;
  const input_amount = new Decimal("1"); // 1 SOL
  const slippage = Percentage.fromFraction(10, 1000); // 1%
  
  // get whirlpool
  const whirlpool_key = PDAUtil.getWhirlpool(
    ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG,
    token_a.mint, token_b.mint, tick_spacing).publicKey;
  console.log("whirlpool_key", whirlpool_key.toBase58());
  const whirlpool = await client.getPool(whirlpool_key);

  // adjust range
  const lower_tick_index = PriceMath.priceToInitializableTickIndex(lower_price, token_a.decimals, token_b.decimals, whirlpool.getData().tickSpacing);
  const upper_tick_index = PriceMath.priceToInitializableTickIndex(upper_price, token_a.decimals, token_b.decimals, whirlpool.getData().tickSpacing);
  console.log(
    "Range:",
    "\n  Lower:", PriceMath.tickIndexToPrice(lower_tick_index, token_a.decimals, token_b.decimals).toFixed(token_b.decimals),
    "\n  Upper:", PriceMath.tickIndexToPrice(upper_tick_index, token_a.decimals, token_b.decimals).toFixed(token_b.decimals)
  );

  // get quote
  const quote = increaseLiquidityQuoteByInputToken(
    input_token.mint,
    input_amount,
    lower_tick_index,
    upper_tick_index,
    slippage,
    whirlpool
  );

  // deposit amount
  const token_a_deposit = DecimalUtil.fromU64(quote.tokenEstA, token_a.decimals).toNumber();
  const token_b_deposit = DecimalUtil.fromU64(quote.tokenEstB, token_b.decimals).toNumber();
  console.log(
    "Deposit token amount:",
    "\n  SOL  deposit:", token_a_deposit,
    "\n  USDC deposit:", token_b_deposit
  );

  // get token USD price from coingecko
  const token_list = await (await fetch(ORCA_ENDPOINT_TOKEN)).json();
  const get_coingecko_id = (mint) => token_list.tokens.filter((token) => token.mint == mint).shift().coingeckoId;

  const token_a_coingecko_id = get_coingecko_id(token_a.mint.toBase58());
  const token_b_coingecko_id = get_coingecko_id(token_b.mint.toBase58());

  const ids = [token_a_coingecko_id, token_b_coingecko_id].join(",");
  const coingecko_price = await (await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`)).json();

  const token_a_usd_price = coingecko_price[token_a_coingecko_id].usd;
  const token_b_usd_price = coingecko_price[token_b_coingecko_id].usd;

  console.log(
    "Token USD Price:",
    `\n  SOL (${token_a_coingecko_id}):`, token_a_usd_price,
    `\n  USDC (${token_b_coingecko_id}):`, token_b_usd_price
  );

  // calc ratio
  const token_a_deposit_usd = token_a_deposit * token_a_usd_price;
  const token_b_deposit_usd = token_b_deposit * token_b_usd_price;
  const total_usd = token_a_deposit_usd + token_b_deposit_usd;

  const round_d1 = (n) => Math.round(n * 10)/10;
  console.log(
    "Deposit ratio:",
    "\n  SOL  deposit:", round_d1(token_a_deposit_usd / total_usd * 100), "%",
    "\n  USDC deposit:", round_d1(token_b_deposit_usd / total_usd * 100), "%"
  );
}

main();


/*
SAMPLE OUTPUT

$ ts-node src/78c_deposit_ratio_in_usd.ts 
connection endpoint https://api.mainnet-beta.solana.com
whirlpool_key HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
Range: 
  Lower: 25.066682 
  Upper: 40.250237
Deposit token amount: 
  SOL  deposit: 1 
  USDC deposit: 40.073794
Token USD Price: 
  SOL (wrapped-solana): 32.59 
  USDC (usd-coin): 0.998002
Deposit ratio: 
  SOL  deposit: 44.9 % 
  USDC deposit: 55.1 %

  */