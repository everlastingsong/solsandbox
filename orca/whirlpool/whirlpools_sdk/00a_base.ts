import { WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient } from "@orca-so/whirlpools-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";

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
}

main();
