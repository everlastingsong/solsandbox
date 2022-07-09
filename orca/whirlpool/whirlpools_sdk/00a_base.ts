import { WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient } from "@orca-so/whirlpools-sdk";
import { Provider } from "@project-serum/anchor";

// bash$ export ANCHOR_PROVIDER_URL=https://ssc-dao.genesysgo.net
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts
const provider = Provider.env();
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());

const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
const fetcher = new AccountFetcher(ctx.connection);
const client = buildWhirlpoolClient(ctx, fetcher);
