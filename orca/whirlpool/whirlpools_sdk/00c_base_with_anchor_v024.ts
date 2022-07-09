import { WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient } from "@orca-so/whirlpools-sdk";

// Provider was renamed to AnchorProvider at 0.24.0
// https://github.com/coral-xyz/anchor/blob/master/CHANGELOG.md
// [0.24.0] - 2022-04-12
// Breaking
//   ts: Make Provider an interface and adjust its signatures and add AnchorProvider implementor class (#1707).
import { AnchorProvider } from "@project-serum/anchor";

// bash$ export ANCHOR_PROVIDER_URL=https://ssc-dao.genesysgo.net
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts
const provider = AnchorProvider.env();
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());

// to avoid type mismatch, from is used instead of withProvider
const ctx = WhirlpoolContext.from(provider.connection, provider.wallet, ORCA_WHIRLPOOL_PROGRAM_ID, AnchorProvider.defaultOptions());
const fetcher = new AccountFetcher(ctx.connection);
const client = buildWhirlpoolClient(ctx, fetcher);
