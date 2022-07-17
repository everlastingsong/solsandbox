import { WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient } from "@orca-so/whirlpools-sdk";
import { Provider } from "@project-serum/anchor"; // import AnchorProvider.env() if the version of Anchor >= 0.24.0

// bash$ export ANCHOR_PROVIDER_URL=https://ssc-dao.genesysgo.net
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts
const provider = Provider.env(); // use AnchorProvider.env() if the version of Anchor >= 0.24.0
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());

const ctx = WhirlpoolContext.from(provider.connection, provider.wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
const fetcher = new AccountFetcher(ctx.connection);
const client = buildWhirlpoolClient(ctx, fetcher);
