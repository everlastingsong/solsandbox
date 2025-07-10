// SDK version must be 0.15.0
import { ORCA_WHIRLPOOL_PROGRAM_ID, ParsableTickArray } from "@orca-so/whirlpools-sdk";
import { AccountInfo, Connection, GetProgramAccountsFilter, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

type GpaData = {
    pubkey: PublicKey;
    account: AccountInfo<Buffer>;
};

async function scanProgramAccounts(
  connection: Connection,
  programId: PublicKey,
  filters: GetProgramAccountsFilter[],
  scanByteOffset: number,
): Promise<GpaData[]> {
  const mergedResponse: GpaData[] = [];

  for ( let scanByte = 0x00; scanByte <= 0xFF; scanByte++ ) {
    const scanByteBase58 = bs58.encode(Buffer.from([scanByte]));
    const response = await connection.getProgramAccounts(
      programId,
      {
        filters: [
          ...filters,
          // split a single large gPA call into 256 smaller calls
          { memcmp: { offset: scanByteOffset, bytes: scanByteBase58 } },
        ]
      }
    );

    console.debug(`scanProgramAccounts: scanByte=${scanByte} response.length=${response.length}`);

    if ( response.length > 0 ) {
      mergedResponse.push(...response);
    }
  }

  return mergedResponse;
}

const FIXED_TICK_ARRAY_DISCRIMINATOR = [69, 97, 189, 190, 110, 7, 66, 187];
const DYNAMIC_TICK_ARRAY_DISCRIMINATOR = [17, 216, 246, 142, 225, 199, 218, 56];
const FIXED_TICK_ARRAY_DISCRIMINATOR_BASE58 = bs58.encode(Buffer.from(FIXED_TICK_ARRAY_DISCRIMINATOR));
const DYNAMIC_TICK_ARRAY_DISCRIMINATOR_BASE58 = bs58.encode(Buffer.from(DYNAMIC_TICK_ARRAY_DISCRIMINATOR));

async function main() {
  const rpc = process.env.SOLANA_RPC_URL;
  if (!rpc) {
    throw new Error("SOLANA_RPC_URL environment variable is not set.");
  }
  const connection = new Connection(rpc);

  const fixedTickArrays = await scanProgramAccounts(
    connection,
    ORCA_WHIRLPOOL_PROGRAM_ID,
    [{ memcmp: { offset: 0, bytes: FIXED_TICK_ARRAY_DISCRIMINATOR_BASE58 } }],
    9956, // the first byte of whirlpool address in FixedTickArray layout
  );
  console.debug(`fixedTickArrays.length=${fixedTickArrays.length}`);

  const dynamicTickArrays = await scanProgramAccounts(
    connection,
    ORCA_WHIRLPOOL_PROGRAM_ID,
    [{ memcmp: { offset: 0, bytes: DYNAMIC_TICK_ARRAY_DISCRIMINATOR_BASE58 } }],
    12, // the first byte of whirlpool address in DynamicTickArray layout
  );
  console.debug(`dynamicTickArrays.length=${dynamicTickArrays.length}`);

  const allTickArrays = [...fixedTickArrays, ...dynamicTickArrays];
  console.debug(`allTickArrays.length=${allTickArrays.length}`);

  const parsedTickArrays = allTickArrays.map((gpaData) => ({
    pubkey: gpaData.pubkey,
    parsed: ParsableTickArray.parse(gpaData.pubkey, gpaData.account),
  }));

  // process TickArray data...
  // just count whirlpools having at least one initialized TickArray account for example.
  const whirlpoolAddressSet = new Set<string>();
  for (const tickArray of parsedTickArrays) {
    const whirlpoolAddress = tickArray.parsed.whirlpool.toBase58();
    whirlpoolAddressSet.add(whirlpoolAddress);
  }
  console.debug(`whirlpoolAddressSet.size=${whirlpoolAddressSet.size}`);
}

main();
