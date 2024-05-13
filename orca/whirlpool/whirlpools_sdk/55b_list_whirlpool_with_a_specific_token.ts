// tested on @orca-so/whirlpools-sdk@0.11.7

import { Connection, GetProgramAccountsResponse, Keypair, PublicKey } from "@solana/web3.js";
import {
  WhirlpoolContext,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  ORCA_WHIRLPOOLS_CONFIG,
  ParsableWhirlpool,
} from "@orca-so/whirlpools-sdk";
import { Wallet } from "@coral-xyz/anchor";

// export RPC_ENDPOINT_URL=<YOUR RPC ENDPOINT>

async function main() {
  const RPC_ENDPOINT_URL = process.env["RPC_ENDPOINT_URL"] || "";

  const connection = new Connection(RPC_ENDPOINT_URL);
  const dummyWallet = new Wallet(Keypair.generate());
  const ctx = WhirlpoolContext.from(connection, dummyWallet, ORCA_WHIRLPOOL_PROGRAM_ID);

  const SAMO_MINT_ADDRESS = new PublicKey("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");

  // filter by SAMO
  const whirlpoolsByMintA = await fetchWhirlpoolsByMint(ctx.connection, ORCA_WHIRLPOOLS_CONFIG, "A", SAMO_MINT_ADDRESS);
  const whirlpoolsByMintB = await fetchWhirlpoolsByMint(ctx.connection, ORCA_WHIRLPOOLS_CONFIG, "B", SAMO_MINT_ADDRESS);
  const whirlpools = [...whirlpoolsByMintA, ...whirlpoolsByMintB];

  for (const {pubkey, account} of whirlpools) {
    const whirlpoolData = ParsableWhirlpool.parse(pubkey, account)!;
    console.log(
      "whirlpools with SAMO",
      `address=${pubkey.toBase58()}`,
      `A=${whirlpoolData.tokenMintA.toBase58()}`,
      `B=${whirlpoolData.tokenMintB.toBase58()}`,
      `tickSpacing=${whirlpoolData.tickSpacing}`
    );
  }
}

async function fetchWhirlpoolsByMint(connection: Connection, whirlpoolsConfig: PublicKey, aOrB: "A" | "B", mint: PublicKey): Promise<GetProgramAccountsResponse> {
  const whirlpoolAccountSize = 653;
  const whirlpoolsConfigOffset = 8;
  const tokenMintAOffset = 101;
  const tokenMintBOffset = 181;

  const tokenMintOffset = aOrB === "A" ? tokenMintAOffset : tokenMintBOffset;
  
  const accounts = await connection.getProgramAccounts(
    ORCA_WHIRLPOOL_PROGRAM_ID,
    {
      filters: [
        // filter by size
        {dataSize: whirlpoolAccountSize},
        // filter by whirlpoolsConfig
        {memcmp: {offset: whirlpoolsConfigOffset, bytes: whirlpoolsConfig.toBase58()}},
        // filter by mint
        {memcmp: {offset: tokenMintOffset, bytes: mint.toBase58()}},
      ]
    }
  );

  return accounts;
}

main();
