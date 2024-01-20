import { WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient } from "@orca-so/whirlpools-sdk";
import { Wallet } from "@coral-xyz/anchor";
import { Keypair, Connection } from "@solana/web3.js";

// bash$ ts-node this_script.ts

// you need to use your RPC endpoint (Public RPC is just for example)
const RPC_ENDPOINT_URL= "https://api.mainnet-beta.solana.com";
const COMMITMENT = "confirmed";

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL, COMMITMENT);

  // create dummy wallet with temporary keypair
  const wallet = new Wallet(Keypair.generate());
  
  const ctx = WhirlpoolContext.from(connection, wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const fetcher = ctx.fetcher;
  const client = buildWhirlpoolClient(ctx);
  
  console.log("connection endpoint", ctx.connection.rpcEndpoint);
  console.log("wallet", ctx.wallet.publicKey.toBase58());
}

main();
