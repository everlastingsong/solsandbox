import { WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient } from "@orca-so/whirlpools-sdk";
import { Wallet } from "@orca-so/common-sdk";
import { PublicKey, Connection, Transaction, VersionedTransaction } from "@solana/web3.js";

// bash$ ts-node this_script.ts

// you need to use your RPC endpoint (Public RPC is just for example)
const RPC_ENDPOINT_URL= "https://api.mainnet-beta.solana.com";
const COMMITMENT = "confirmed";

class PubkeyWallet implements Wallet {
  constructor(private pubkey: PublicKey) {}
  get publicKey(): PublicKey { return this.pubkey }

  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    throw new Error("Not implemented: This is PubkeyWallet, which cannot sign transactions.");
  }
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    throw new Error("Not implemented: This is PubkeyWallet, which cannot sign transactions.");
  }
}

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL, COMMITMENT);

  // you can use your own public key
  const pubkey = new PublicKey("r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6");
  const wallet = new PubkeyWallet(pubkey);
  
  const ctx = WhirlpoolContext.from(connection, wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const fetcher = ctx.fetcher;
  const client = buildWhirlpoolClient(ctx);
  
  console.log("connection endpoint", ctx.connection.rpcEndpoint);
  console.log("wallet", ctx.wallet.publicKey.toBase58());
}

main();
