import { PublicKey, Connection } from "@solana/web3.js";
import { ORCA_WHIRLPOOL_PROGRAM_ID, ParsablePosition } from "@orca-so/whirlpools-sdk";
import base58 from "bs58";

// Specify which RPCs can use getProgramAccounts (some RPCs restrict its use)
const RPC_ENDPOINT_URL="https://rpc.ankr.com/solana"

function i32_to_le_bytes(n: number): Uint8Array {
  const bytes = new Uint8Array(4);
  const data_view = new DataView(bytes.buffer);
  data_view.setInt32(0, n, true); // littleEndian=true
  return bytes;
}

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL);
  console.log("connection endpoint", connection.rpcEndpoint);

  // find positions
  // whirlpool = SAMO/USDC(64)
  // position range = [-123776, -109952]
  const whirlpool_pubkey = new PublicKey("9vqYJjDUFecLL2xPUC4Rc7hyCtZ6iJ4mDiVZX7aFXoAe"); // SAMO/USDC(64)
  const lower_index = -123776;
  const upper_index = -109952;
  const lower_index_bytes_b58 = base58.encode(i32_to_le_bytes(lower_index));
  const upper_index_bytes_b58 = base58.encode(i32_to_le_bytes(upper_index));

  console.log("memcmp filters:", whirlpool_pubkey.toBase58(), lower_index_bytes_b58, upper_index_bytes_b58);
  const gPA = await connection.getProgramAccounts(ORCA_WHIRLPOOL_PROGRAM_ID, {
    commitment: "confirmed",
    filters: [
      // account LAYOUT: https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/position.rs#L20
      {dataSize: 216},
      {memcmp: {bytes: whirlpool_pubkey.toBase58(), offset: 8}},
      {memcmp: {bytes: lower_index_bytes_b58, offset: 8+32+32+16+0}},
      {memcmp: {bytes: upper_index_bytes_b58, offset: 8+32+32+16+4}},
    ]
  });

  gPA.map((account) => {
    const parsed = ParsablePosition.parse(account.account.data);
    console.log("position address:", account.pubkey.toBase58(), "liquidity:", parsed.liquidity.toString());
  });
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/80b_find_whirlpool_position_by_pool_and_index_range.ts 
connection endpoint https://rpc.ankr.com/solana
memcmp filters: 9vqYJjDUFecLL2xPUC4Rc7hyCtZ6iJ4mDiVZX7aFXoAe 4Gw9xi 4HFHxz
position address: DrqoWxxo489mvhwBG23d4894vpBXKSDgDX6RrgiXSpJC liquidity: 11856342

*/