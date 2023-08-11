import { Connection } from "@solana/web3.js";
import { ORCA_WHIRLPOOL_PROGRAM_ID, ParsablePosition } from "@orca-so/whirlpools-sdk";

// usage:
// export RPC_ENDPOINT_URL=<YOUR RPC which allow you to use getProgramAccounts call>
// ts-node thisScript.ts <whirlpoolPubkey> > output.csv

async function main() {
  const RPC_ENDPOINT_URL = process.env["RPC_ENDPOINT_URL"];
  if (!RPC_ENDPOINT_URL) {
    console.error("Please set RPC_ENDPOINT_URL env variable");
    process.exit(1);
  }

  const whirlpoolPubkey = process.argv[2] ?? "";
  if (!whirlpoolPubkey) {
    console.error("Please provide whirlpool pubkey as first argument");
    process.exit(1);
  }

  const connection = new Connection(RPC_ENDPOINT_URL);

  // find positions
  const gPA = await connection.getProgramAccounts(ORCA_WHIRLPOOL_PROGRAM_ID, {
    commitment: "confirmed",
    filters: [
      // account LAYOUT: https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/position.rs#L20
      {dataSize: 216},
      {memcmp: {bytes: whirlpoolPubkey, offset: 8}},
    ]
  });

  // dump as CSV
  console.log(["position", "liquidity", "tickLowerIndex", "tickUpperIndex"].join(","));
  gPA.forEach((account) => {
    const parsed = ParsablePosition.parse(account.pubkey, account.account);

    // skip zero liquidity positions
    if (parsed.liquidity.isZero()) return;

    console.log([
      account.pubkey.toBase58(),
      parsed.liquidity.toString(),
      parsed.tickLowerIndex,
      parsed.tickUpperIndex,
    ].join(","));
  });
}

main();

