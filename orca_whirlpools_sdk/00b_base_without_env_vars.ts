import { WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient } from "@orca-so/whirlpools-sdk";
import { Provider } from "@project-serum/anchor";
const { Wallet } = require("@project-serum/anchor"); // v0.20.1 bug, import is not possible
import { Keypair, Connection } from "@solana/web3.js";

const RPC_ENDPOINT_URL="https://ssc-dao.genesysgo.net"
const COMMITMENT = "confirmed";

const connection = new Connection(RPC_ENDPOINT_URL, COMMITMENT);
const keypair = Keypair.generate(); // Dummy
const provider = new Provider(connection, new Wallet(keypair), Provider.defaultOptions());
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());

const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
const fetcher = new AccountFetcher(ctx.connection);
const client = buildWhirlpoolClient(ctx, fetcher);
