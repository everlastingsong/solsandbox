import { WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient, swapQuoteByInputToken, getAllWhirlpoolAccountsForConfig, ORCA_WHIRLPOOLS_CONFIG, Trade, IGNORE_CACHE, RoutingOptions, RouterUtils, RouteSelectOptions } from "@orca-so/whirlpools-sdk";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { Percentage, DecimalUtil } from "@orca-so/common-sdk";
import Decimal from "decimal.js";

// FOR whirlpools-sdk v0.11.4

const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const DECIMALS_USDC = 6;
const ORCA = new PublicKey("orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE");
const DECIMALS_ORCA = 6;

async function main() {
  // bash$ export ANCHOR_PROVIDER_URL=<YOUR RPC ENDPOINT (HELIUS, QuickNode, Alchemy, and so on)>
  // bash$ export ANCHOR_WALLET=<YOUR WALLET JSON FILE (~/.config/solana/id.json)>
  const provider = AnchorProvider.env();
  console.log("connection endpoint", provider.connection.rpcEndpoint);
  console.log("wallet", provider.wallet.publicKey.toBase58());

  const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
  const client = buildWhirlpoolClient(ctx);

  // find all Orca supported whirlpools
  console.log("find whirlpools...");
  const orcaSupportedWhirlpools = await getAllWhirlpoolAccountsForConfig({
    connection: ctx.connection,
    programId: ctx.program.programId,
    configId: ORCA_WHIRLPOOLS_CONFIG,
  });
  console.log("num of whirlpools", orcaSupportedWhirlpools.size);

  // We allow WhirlpoolRouter to use all Orca supported whirlpools,
  // but eliminate whirlpools whose "current" liquidity is zero for efficiency.
  console.log("build router...");
  const addresses = Array.from(orcaSupportedWhirlpools.entries())
    .filter(([_address, data]) => !data.liquidity.isZero())
    .map(([address, _data]) => address);
  console.log("num of liquid whirlpools", addresses.length);
  const router = await client.getRouter(addresses);

  // Trade USDC to ORCA
  const trade: Trade = {
    tokenIn: USDC,
    tokenOut: ORCA,
    amountSpecifiedIsInput: true, // we specify USDC input amount
    tradeAmount: DecimalUtil.toBN(new Decimal("0.01"), DECIMALS_USDC), // 0.01 USDC
  };

  // find route...
  console.log("find route...");
  const routingOptions: RoutingOptions = {
    ...RouterUtils.getDefaultRouteOptions(),
    // add your custom setting if you want
  };

  const selectionOptions: RouteSelectOptions = {
    ...RouterUtils.getDefaultSelectOptions(),
    maxSupportedTransactionVersion: ctx.txBuilderOpts.defaultBuildOption.maxSupportedTransactionVersion,
    availableAtaAccounts: undefined, // allow all intermediate tokens
    // add your custom setting if you want
  };

  const bestRoute = await router.findBestRoute(
    trade,
    routingOptions,
    selectionOptions,
    IGNORE_CACHE // use the latest on-chain data to find the best route
  );

  if (!bestRoute) {
    console.log("No route found");
    return;
  }
  const [tradeRoute, alts] = bestRoute;

  console.log("estimatedAmountIn:", DecimalUtil.fromBN(tradeRoute.totalAmountIn, DECIMALS_USDC));
  console.log("estimatedAmountOut:", DecimalUtil.fromBN(tradeRoute.totalAmountOut, DECIMALS_ORCA));
  tradeRoute.subRoutes.forEach((subRoute, i) => {
    console.log(`subRoute ${i} ${subRoute.splitPercent}%:`, subRoute.path.edges.map((e) => e.poolAddress).join(" - "));
  });
  console.log("alts:", alts?.map((a) => a.key.toBase58()).join(", "));

  // build transaction
  console.log("tx processing...");
  const acceptableSlippage = Percentage.fromFraction(1, 100); // 1%
  const builder = await router.swap(tradeRoute, acceptableSlippage, null /* should be resolved in the function */);

  // execute
  try {
    const blockhash = await ctx.connection.getLatestBlockhash("confirmed");
    const signature = await builder.buildAndExecute({
      latestBlockhash: blockhash,
      maxSupportedTransactionVersion: !!alts ? 0 : "legacy", // use legacy tx if alts are not used
      lookupTableAccounts: alts
    });

    console.log("transaction confirmed", signature);
  } catch (e) {
    console.log("transaction failed", e);
  }
}

main();

/*

SAMPLE OUTPUT:

$ ts-node src/14a_whirlpool_router.ts 
connection endpoint https://rpc.helius.xyz/?apiKey=<removed>
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
find whirlpools...
num of whirlpools 1281
build router...
num of liquid whirlpools 475
find route...
estimatedAmountIn: 0.01
estimatedAmountOut: 0.010824
subRoute 0 100%: AqJ5JYNb7ApkJwvbuXxPnTtKeuizjvC1s2fkp382y9LC - HiqVrTjxi8ykkuj6z8jNCZdkVBUrjK5GumLSQzVfai6k
alts: undefined
tx processing...
transaction confirmed GLqZSmKXn14NPtY9pUrvjSNHgViEtGVqjs57QbX6vjUCcHBqJtKdbMA3MbGeGby6q7CZ6ZmFD5afthcytFEgx9U

*/