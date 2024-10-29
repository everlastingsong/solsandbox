import { WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient, getAllPositionAccountsByOwner } from "@orca-so/whirlpools-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Percentage } from "@orca-so/common-sdk";
import { assert } from "console";

// bash$ export ANCHOR_PROVIDER_URL=<YOUR RPC ENDPOINT>
// bash$ export ANCHOR_WALLET=<YOUR WALLET JSON FILEPATH>
// bash$ ts-node this_script.ts

async function main() {
  const provider = AnchorProvider.env();
  console.log("connection endpoint", provider.connection.rpcEndpoint);
  console.log("wallet", provider.wallet.publicKey.toBase58());

  const ctx = WhirlpoolContext.from(provider.connection, provider.wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const fetcher = ctx.fetcher;
  const client = buildWhirlpoolClient(ctx);

  // get all positions in my wallet
  const positions = await getAllPositionAccountsByOwner({
    ctx,
    owner: ctx.wallet.publicKey,
    includesPositions: true,
    includesPositionsWithTokenExtensions: true,
    includesBundledPositions: false,
  });

  // print
  for (const [address, position] of positions.positions.entries()) {
    console.log("position", address, "on", position.whirlpool.toString(), "liquidity", position.liquidity.toString());
  }

  // find minimum liq position
  const positionWithMinimumLiquidity = (
    Array.from(positions.positions.entries())
      .sort((a, b) => a[1].liquidity.cmp(b[1].liquidity))
  )[0];
  console.log("minimum liquidity position", positionWithMinimumLiquidity[0], positionWithMinimumLiquidity[1].liquidity.toString());

  // close the minimum liq position
  const whirlpool = await client.getPool(positionWithMinimumLiquidity[1].whirlpool);
  const closePositionTxs = await whirlpool.closePosition(positionWithMinimumLiquidity[0], Percentage.fromFraction(1, 100));

  // closePosition may be large transaction (multiple TransactionBuilder)
  // but 1 TransactionBuilder in almost all cases
  // note: ALT will help to pack them into 1 transaction.
  assert(closePositionTxs.length === 1);

  const signature = await closePositionTxs[0].buildAndExecute({computeBudgetOption: {
    type: "fixed",
    priorityFeeLamports: 10_000,
  }});
  console.log("signature", signature);

  // sample: https://solscan.io/tx/3n4x7BMsq7TY3gZz2FA9SrUmtQjsyn4D3qMt6cSFiWrYdCWqs8QTyq8Kpn5ahtmXKDM9K4zrjJqaX8Z3ocow1em3
}

main();
