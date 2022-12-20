import { Wallet } from "@project-serum/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import base58 from "bs58";
import * as prompt from "prompt";
import { ORCA_WHIRLPOOL_PROGRAM_ID, WhirlpoolContext, buildWhirlpoolClient, ParsablePosition } from "@orca-so/whirlpools-sdk";

// Specify which RPCs can use getProgramAccounts (some RPCs restrict its use)
const RPC_ENDPOINT_URL = "https://rpc.ankr.com/solana";

function i32_to_le_bytes(n: number): Uint8Array {
  const bytes = new Uint8Array(4);
  const data_view = new DataView(bytes.buffer);
  data_view.setInt32(0, n, true); // littleEndian=true
  return bytes;
}

function price_to_nearest_initializable_tick_index(price: number, tick_spacing: number): number {
  return Math.round(Math.log(price) / Math.log(1.0001) / tick_spacing) * tick_spacing;
}

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL);
  console.log("connection endpoint", connection.rpcEndpoint);
  
  const dummy_wallet = new Wallet(Keypair.generate());
  const ctx = WhirlpoolContext.from(connection, dummy_wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const client = buildWhirlpoolClient(ctx);

  // prompt
  const {whirlpool_pubkey} = await prompt.get(["whirlpool_pubkey"]);
  const {lower_price} = await prompt.get(["lower_price"]);
  const {upper_price} = await prompt.get(["upper_price"]);

  const whirlpool = await client.getPool(new PublicKey(whirlpool_pubkey));

  // convert price to tick index
  const decimal_adjust =  Math.pow(10, whirlpool.getTokenBInfo().decimals - whirlpool.getTokenAInfo().decimals);
  const tick_spacing = whirlpool.getData().tickSpacing;
  const lower_price_decimal_adjusted = lower_price * decimal_adjust;
  const upper_price_decimal_adjusted = upper_price * decimal_adjust;
  const lower_index = price_to_nearest_initializable_tick_index(lower_price_decimal_adjusted, tick_spacing);
  const upper_index = price_to_nearest_initializable_tick_index(upper_price_decimal_adjusted, tick_spacing);
  console.log("lower:", lower_price, lower_price_decimal_adjusted, lower_index, Math.pow(1.0001, lower_index));
  console.log("upper:", upper_price, upper_price_decimal_adjusted, upper_index, Math.pow(1.0001, upper_index));

  const lower_index_bytes_b58 = base58.encode(i32_to_le_bytes(lower_index));
  const upper_index_bytes_b58 = base58.encode(i32_to_le_bytes(upper_index));

  console.log("memcmp filters:", whirlpool_pubkey, lower_index_bytes_b58, upper_index_bytes_b58);
  const gPA = await connection.getProgramAccounts(ORCA_WHIRLPOOL_PROGRAM_ID, {
    commitment: "confirmed",
    filters: [
      // account LAYOUT: https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/position.rs#L20
      {dataSize: 216},
      {memcmp: {bytes: whirlpool.getAddress().toBase58(), offset: 8}},
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

$ ts-node src/80c_find_whirlpool_position_by_pool_and_price_range.ts 
connection endpoint https://rpc.ankr.com/solana
prompt: whirlpool_pubkey:  9vqYJjDUFecLL2xPUC4Rc7hyCtZ6iJ4mDiVZX7aFXoAe
prompt: lower_price:  0.004214
prompt: upper_price:  0.016791
lower: 0.004214 0.000004214 -123776 0.000004214493409600438
upper: 0.016791 0.000016791000000000002 -109952 0.000016791289693260275
memcmp filters: 9vqYJjDUFecLL2xPUC4Rc7hyCtZ6iJ4mDiVZX7aFXoAe 4Gw9xi 4HFHxz
position address: DrqoWxxo489mvhwBG23d4894vpBXKSDgDX6RrgiXSpJC liquidity: 11856342

*/