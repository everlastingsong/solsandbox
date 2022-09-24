import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import {
    WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PDAUtil, ORCA_WHIRLPOOLS_CONFIG, swapQuoteByInputToken, swapQuoteWithParams, SwapUtils,
    TICK_ARRAY_SIZE, MIN_TICK_INDEX, MAX_TICK_INDEX, PriceMath, TickArray
} from "@orca-so/whirlpools-sdk";
import { WhirlpoolsError, WhirlpoolsErrorCode, SwapErrorCode } from "@orca-so/whirlpools-sdk/dist/errors/errors";
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
  const a_to_b = true;
  //const amount_in = new Decimal("100" /* SOL */);
  const amount_in = new Decimal("1000000" /* SOL */);
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

  let quote = null;
  try {
    quote = await swapQuoteByInputToken(
      whirlpool,
      input_token.mint,
      DecimalUtil.toU64(amount_in, input_token.decimals),
      acceptable_slippage,
      ctx.program.programId,
      fetcher,
      true
    );
  } catch ( e ) {
    if ( e.errorCode === SwapErrorCode.TickArraySequenceInvalid && e.message?.startsWith("Swap input value traversed too many arrays.") ) {
      console.log("Too large input or too low liquidity !!");
    }
    return;
  }

  // print quote
  console.log("aToB", quote.aToB);
  console.log("estimatedAmountIn", DecimalUtil.fromU64(quote.estimatedAmountIn, input_token.decimals).toString(), input_token.symbol);
  console.log("estimatedAmountOut", DecimalUtil.fromU64(quote.estimatedAmountOut, output_token.decimals).toString(), output_token.symbol);
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/82c_get_quote_with_catch_exception.ts
whirlpool_key HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
Too large input or too low liquidity !!

*/