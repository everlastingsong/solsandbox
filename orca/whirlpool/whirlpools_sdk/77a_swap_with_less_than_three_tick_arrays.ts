import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { WhirlpoolContext, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID, SwapUtils, swapQuoteWithParams } from "@orca-so/whirlpools-sdk";
import { Percentage } from "@orca-so/common-sdk";
import { Wallet } from "@project-serum/anchor";
import { u64 } from "@solana/spl-token";

const RPC_ENDPOINT_URL = "https://api.mainnet-beta.solana.com";


async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL);
  console.log("connection endpoint", connection.rpcEndpoint);
  
  const dummy_wallet = new Wallet(Keypair.generate());
  const ctx = WhirlpoolContext.from(connection, dummy_wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const client = buildWhirlpoolClient(ctx);

  // get whirlpool
  const whirlpool_pubkey = new PublicKey("6upZT3murB7Rae3461JU1PUpuEpT13SrfcU4uawkSZsZ")
  const whirlpool = await client.getPool(whirlpool_pubkey);

  const a_to_b = true;
  const amount = new u64(1000000);
  const slippage = Percentage.fromFraction(1, 100);

  // ------------------------------------------------------------------------------------------
  // swapQuoteByInputToken --> getTickArrays + swapQuoteWithParams
  const tick_arrays = await SwapUtils.getTickArrays(
    whirlpool.getData().tickCurrentIndex,
    whirlpool.getData().tickSpacing,
    a_to_b,
    ORCA_WHIRLPOOL_PROGRAM_ID,
    whirlpool_pubkey,
    ctx.fetcher,
    true
  );

  // bug workaround: cut off tick_arrays if it contains null
  //   [ta0,  ta1,   ta2] => [ta0, ta1, ta2]
  //   [ta0,  ta1,  null] => [ta0, ta1]
  //   [ta0,  null, null] => [ta0]
  //   [ta0,  null,  ta2] => [ta0]
  //   [null, null, null] => []  (ta0 is must be initialized...)
  let null_pos = 0;
  while ( null_pos < tick_arrays.length && tick_arrays[null_pos].data !== null ) null_pos++;
  while ( null_pos < tick_arrays.length ) tick_arrays.pop();

  const quote = swapQuoteWithParams({
    whirlpoolData: whirlpool.getData(),
    tokenAmount: amount,
    aToB: a_to_b,
    amountSpecifiedIsInput: true,
    otherAmountThreshold: SwapUtils.getDefaultOtherAmountThreshold(true),
    sqrtPriceLimit: SwapUtils.getDefaultSqrtPriceLimit(a_to_b),
    tickArrays: tick_arrays,
  }, slippage);
  // ------------------------------------------------------------------------------------------

  console.log("in", quote.estimatedAmountIn.toString());
  console.log("out", quote.estimatedAmountOut.toString());
}

main();


/*
SAMPLE OUTPUT

$ ts-node src/77a_swap_with_less_than_three_tick_arrays.ts 
connection endpoint https://api.mainnet-beta.solana.com
in 1000000
out 1444

*/