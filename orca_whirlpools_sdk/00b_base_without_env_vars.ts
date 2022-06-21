import { WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient } from "@orca-so/whirlpools-sdk";
const { Wallet } = require("@project-serum/anchor"); // v0.20.1 bug, import for Wallet is not possible
import { Keypair, Connection } from "@solana/web3.js";

const RPC_ENDPOINT_URL="https://ssc-dao.genesysgo.net"
const COMMITMENT = "confirmed";

const connection = new Connection(RPC_ENDPOINT_URL, COMMITMENT);
const wallet = new Wallet(Keypair.generate()); // dummy

const ctx = WhirlpoolContext.from(connection, wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
const fetcher = new AccountFetcher(ctx.connection);
const client = buildWhirlpoolClient(ctx, fetcher);

console.log("connection endpoint", ctx.connection.rpcEndpoint);
console.log("wallet", ctx.wallet.publicKey.toBase58());
