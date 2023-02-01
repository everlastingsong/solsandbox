import { WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient, swapQuoteByInputToken, swapQuoteWithParams, SwapUtils, PriceMath } from "@orca-so/whirlpools-sdk";
import { AnchorProvider, Wallet } from "@project-serum/anchor";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { Percentage, DecimalUtil } from "@orca-so/common-sdk";
import Decimal from "decimal.js";

async function main() {
  // bash$ export ANCHOR_PROVIDER_URL=https://rpc.ankr.com/solana
  // bash$ export ANCHOR_WALLET=~/.config/solana/id.json
  // const provider = AnchorProvider.env();

  // setup client
  const RPC = "https://rpc.ankr.com/solana";
  const connection = new Connection(RPC, "confirmed");
  const dummyWallet = new Wallet(Keypair.generate());
  const provider = new AnchorProvider(connection, dummyWallet, AnchorProvider.defaultOptions());

  console.log("connection endpoint", provider.connection.rpcEndpoint);
  console.log("wallet", provider.wallet.publicKey.toBase58());

  const ctx = WhirlpoolContext.from(provider.connection, provider.wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const client = buildWhirlpoolClient(ctx);

  const SOL_USDC_64 = new PublicKey("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ");
  const pool = await client.getPool(SOL_USDC_64);
  const sol = pool.getTokenAInfo();
  const usdc = pool.getTokenBInfo();

  // get Quote: input is 1,000,000 SOL
  const input = new Decimal("1000000"); // Decimal is for UI notation
  const inputU64 = DecimalUtil.toU64(input, sol.decimals); // u64 is internal representation
  const aToB = true; // sol(A) to usdc(B)

  const acceptableSlippage = Percentage.fromFraction(0, 100); // 0%

  // limit is 15 USDC/SOL
  const sqrtPriceLimit = PriceMath.priceToSqrtPriceX64(
    new Decimal("15"),
    sol.decimals,
    usdc.decimals,
  );

  const tickArrays = await SwapUtils.getTickArrays(
    pool.getData().tickCurrentIndex,
    pool.getData().tickSpacing,
    aToB,
    ORCA_WHIRLPOOL_PROGRAM_ID,
    pool.getAddress(),
    ctx.fetcher,
    true
  );

  const quote = await swapQuoteWithParams({
    whirlpoolData: pool.getData(),
    aToB,
    amountSpecifiedIsInput: true,
    tokenAmount: inputU64,
    sqrtPriceLimit,
    otherAmountThreshold: SwapUtils.getDefaultOtherAmountThreshold(true), // 0 to estimate
    tickArrays,
  }, acceptableSlippage);

  const estimatedAmountInU64 = quote.estimatedAmountIn;
  const estimatedAmountOutU64 = quote.estimatedAmountOut;
  const estimatedAmountInDecimal = DecimalUtil.fromU64(estimatedAmountInU64, sol.decimals);
  const estimatedAmountOutDecimal = DecimalUtil.fromU64(estimatedAmountOutU64, usdc.decimals);
  const estimatedEndPrice = PriceMath.sqrtPriceX64ToPrice(quote.estimatedEndSqrtPrice, sol.decimals, usdc.decimals);

  console.log("estimatedAmountIn SOL", estimatedAmountInDecimal.toString());
  console.log("estimatedAmountOut USDC", estimatedAmountOutDecimal.toString());
  console.log("estimatedEndPrice", estimatedEndPrice.toFixed(usdc.decimals));
}

main();

/*

SAMPLE OUTPUT:

$ ts-node src/66a_quick_liquidity_depth_check.ts 
connection endpoint https://rpc.ankr.com/solana
wallet E9snnq76u7Ap6mfQrApLhYBWFa82TTyyc7gMKQU94JeW
estimatedAmountIn SOL 30727.912332321
estimatedAmountOut USDC 657900.426087
estimatedEndPrice 14.999999

*/
