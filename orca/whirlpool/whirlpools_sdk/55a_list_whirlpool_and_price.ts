// tested on @orca-so/whirlpools-sdk@0.11.7

import { Connection, Keypair } from "@solana/web3.js";
import {
  WhirlpoolContext,
  getAllWhirlpoolAccountsForConfig,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  ORCA_WHIRLPOOLS_CONFIG,
  PriceMath,
} from "@orca-so/whirlpools-sdk";
import { Wallet } from "@coral-xyz/anchor";

// export RPC_ENDPOINT_URL=<YOUR RPC ENDPOINT>

async function main() {
  const RPC_ENDPOINT_URL = process.env["RPC_ENDPOINT_URL"] || "";

  const connection = new Connection(RPC_ENDPOINT_URL);
  const dummyWallet = new Wallet(Keypair.generate());
  const ctx = WhirlpoolContext.from(connection, dummyWallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const fetcher = ctx.fetcher;

  const whirlpools = await getAllWhirlpoolAccountsForConfig({
    connection,
    programId: ORCA_WHIRLPOOL_PROGRAM_ID,
    configId: ORCA_WHIRLPOOLS_CONFIG
  });

  const mints = new Set<string>();
  for (const [key, data] of whirlpools) {
    mints.add(data.tokenMintA.toBase58());
    mints.add(data.tokenMintB.toBase58());
  }
  const tokens = await fetcher.getMintInfos(Array.from(mints));


  for (const [key, data] of whirlpools) {
    const decA = tokens.get(data.tokenMintA.toBase58())!.decimals;
    const decB = tokens.get(data.tokenMintB.toBase58())!.decimals;

    const price = PriceMath.sqrtPriceX64ToPrice(data.sqrtPrice, decA, decB);

    console.log("pool", key);
    console.log("\ttokenA", data.tokenMintA.toBase58(), decA);
    console.log("\ttokenB", data.tokenMintB.toBase58(), decB);
    console.log("\ttickSpacing", data.tickSpacing.toString());
    console.log("\tprice", price.toString(), "tokenB/tokenA");
  }
}

main();
