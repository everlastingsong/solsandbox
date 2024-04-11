// tested with @orca-so/whirlpools-sdk v0.11.7

import { WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient, swapQuoteByInputToken, getAllWhirlpoolAccountsForConfig, ORCA_WHIRLPOOLS_CONFIG, Trade, IGNORE_CACHE, RoutingOptions, RouterUtils, RouteSelectOptions } from "@orca-so/whirlpools-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";

async function main() {
  // bash$ export ANCHOR_PROVIDER_URL=<YOUR RPC ENDPOINT (HELIUS, SHYFT, QuickNode, Alchemy, and so on)>
  // bash$ export ANCHOR_WALLET=<YOUR WALLET JSON FILE (~/.config/solana/id.json)>
  const provider = AnchorProvider.env();

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

  // print first 2 whirlpools
  Array.from(orcaSupportedWhirlpools.keys()).slice(0, 2).forEach((address) => {
    const data = orcaSupportedWhirlpools.get(address)!;
    console.log(
      `address: ${address}` +
      `\n \ttokenA: ${data.tokenMintA.toBase58()}` +
      `\n \ttokenB: ${data.tokenMintB.toBase58()}`
    );
  });
}

main();

/*

SAMPLE OUTPUT:

find whirlpools...
num of whirlpools 6612
address: F2BvoYzue2PmhLLhLxG9T4fp3UtknS9L5iVpgLWejUFC
        tokenA: 4drRsHtgGBKt1dR1t7JvajHCfeGfQYV1AucS3fJhUK2m
        tokenB: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
address: BTZYsrwzRGkjxbCSvb9XxTjvirbyd4QQEca2pTemnuP5
        tokenA: So11111111111111111111111111111111111111112
        tokenB: EJ47n5hhBavhtZBNqTdqPwtSN9756t2FpyHZHHaZ2Wp5

*/
