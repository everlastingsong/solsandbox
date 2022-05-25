use solana_client::{rpc_client::RpcClient};
use solana_sdk::{
    pubkey::Pubkey,
    commitment_config::CommitmentConfig,
    signature::{read_keypair_file, Keypair},
};
use solana_client_helpers::{Client};
use std::{str::FromStr, char::MAX};
use anchor_lang::prelude::*;
use std::cell::RefCell;
use chrono::Utc;

// use Whirlpool SDK as crate
// reference: https://qiita.com/AyachiGin/items/6d098d512e6766181a01
//
// DIRECTORY STRUCTURE
//
// + somewhere
//   + whirlpool_swap_quote   (MY PROJECT)
//     + Cargo.toml
//     + Cargo.lock
//     + src
//       + main.rs
//   + whirlpools (git clone https://github.com/orca-so/whirlpools/)
//     + programs
//       + whirlpool
//
extern crate whirlpool;
use crate::whirlpool::{
  state::{Whirlpool, TickArray, TICK_ARRAY_SIZE, MAX_TICK_INDEX, MIN_TICK_INDEX},
  manager::swap_manager::swap,
  util::swap_tick_sequence::SwapTickSequence,
  math::sqrt_price_from_tick_index,
};

// error: error: failed to select a version for the requirement `anchor-lang = "^0.20.1"`
// solution: use Cargo.lock from whirlpools
// reference: https://github.com/project-serum/anchor/issues/1847
// reference: https://doc.rust-jp.rs/book-ja/ch14-02-publishing-to-crates-io.html#cargo-yank%E3%81%A7cratesio%E3%81%8B%E3%82%89%E3%83%90%E3%83%BC%E3%82%B8%E3%83%A7%E3%83%B3%E3%82%92%E5%89%8A%E9%99%A4%E3%81%99%E3%82%8B

fn div_floor(a: i32, b: i32) -> i32 {
  if a < 0 { a / b - 1 } else { a / b }
}

// https://orca-so.github.io/whirlpools/classes/TickUtil.html#getStartTickIndex
// https://github.com/orca-so/whirlpools/blob/main/sdk/src/utils/public/tick-utils.ts#L33
fn tickutil_get_start_tick_index(tick_current_index: i32, tick_spacing: u16, offset: i32) -> i32 {
  let ticks_in_array = TICK_ARRAY_SIZE * tick_spacing as i32;
  let real_index = div_floor(tick_current_index, ticks_in_array);
  let start_tick_index = (real_index + offset) * ticks_in_array;

  assert!(MIN_TICK_INDEX <= start_tick_index);
  assert!(start_tick_index + ticks_in_array <= MAX_TICK_INDEX);
  start_tick_index
}

// https://orca-so.github.io/whirlpools/classes/PDAUtil.html#getTickArray
// https://github.com/orca-so/whirlpools/blob/main/sdk/src/utils/public/pda-utils.ts#L83
// https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/instructions/initialize_tick_array.rs#L16
fn pdautil_get_tick_array(program_id: &Pubkey, whirlpool_pubkey: &Pubkey, start_tick_index: i32) -> Pubkey {
  let start_tick_index_str = start_tick_index.to_string();
  let seeds = [
    b"tick_array",
    whirlpool_pubkey.as_ref(),
    start_tick_index_str.as_bytes(),
  ];
  let (pubkey, _bump) = Pubkey::find_program_address(&seeds, program_id);
  pubkey
}

// https://orca-so.github.io/whirlpools/classes/PoolUtil.html#getTickArrayPublicKeysForSwap
// https://github.com/orca-so/whirlpools/blob/main/sdk/src/utils/public/pool-utils.ts#L174
fn poolutil_get_tick_array_pubkeys_for_swap(
  tick_current_index: i32,
  tick_spacing: u16,
  a_to_b: bool,
  program_id: &Pubkey,
  whirlpool_pubkey: &Pubkey,
) -> [Pubkey; 3] {
  let mut offset = 0;
  let mut pubkeys: [Pubkey; 3] = Default::default();

  for i in 0..pubkeys.len() {
    let start_tick_index = tickutil_get_start_tick_index(tick_current_index, tick_spacing, offset);
    let tick_array_pubkey = pdautil_get_tick_array(program_id, whirlpool_pubkey, start_tick_index);
    pubkeys[i] = tick_array_pubkey;
    offset = if a_to_b { offset - 1 } else { offset + 1 };
  }

  pubkeys
}

// https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/instructions/swap.rs#L48
fn get_swap_quote(
  whirlpool: &Whirlpool,
  tick_arrays: [TickArray; 3],
  amount: u64,
  amount_specified_is_input: bool,
  a_to_b: bool,
) -> [u64; 2] {
  let ta0_refcell = RefCell::new(tick_arrays[0]);
  let ta1_refcell = RefCell::new(tick_arrays[1]);
  let ta2_refcell = RefCell::new(tick_arrays[2]);
  let mut swap_tick_sequence = SwapTickSequence::new(
    ta0_refcell.borrow_mut(),
    Some(ta1_refcell.borrow_mut()),
    Some(ta2_refcell.borrow_mut()),
  );

  // off-chain time...
  let dt = Utc::now();
  let timestamp = u64::try_from(dt.timestamp()).unwrap();

  // limit by bound...
  let sqrt_price_limit = if a_to_b {
    sqrt_price_from_tick_index(tick_arrays[2].start_tick_index)
  } else {
    let ticks_in_array = TICK_ARRAY_SIZE * whirlpool.tick_spacing as i32;
    sqrt_price_from_tick_index(tick_arrays[2].start_tick_index + ticks_in_array)
  };

  let swap_update = swap(
    whirlpool,
    &mut swap_tick_sequence,
    amount,
    sqrt_price_limit,
    amount_specified_is_input,
    a_to_b,
    timestamp,
  ).unwrap();

  [swap_update.amount_a, swap_update.amount_b]
}

// reference: https://www.wizzairprices.com/blog/crypto/blockchain/solana/explore-solana-blockchain-with-rust-part-1.html
fn main() {
  // connection
  let url = "https://ssc-dao.genesysgo.net/";
  let connection = RpcClient::new_with_commitment(url.to_string(), CommitmentConfig::confirmed());

  // Load your wallet account from filesystem (from default location)
  // let wallet = read_keypair_file(&*shellexpand::tilde("~/.config/solana/id.json")).expect("Example requires a keypair file");

  // temporary
  let wallet = Keypair::new();

  // helper client
  let client = Client { client: connection, payer: wallet };

  // pool & swap input
  let ORCA_WHIRLPOOL_PROGRAM_ID = Pubkey::from_str("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc").unwrap();
  let SOL_USDC_WHIRLPOOL_ADDRESS = Pubkey::from_str("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ").unwrap();

  //1) SOL to USDC
  let a_to_b = true;
  let amount_in = 1_000_000_000u64; // 1 SOL
  //2) USDC to SOL
  //let a_to_b = false;
  //let amount_in = 100_000_000u64; // 100 USDC

  // get whirlpool
  let mut whirlpool_data: &[u8] = &client.get_account_data(&SOL_USDC_WHIRLPOOL_ADDRESS).unwrap();
  let whirlpool = Whirlpool::try_deserialize(&mut whirlpool_data).unwrap();

  println!("whirlpool token_mint_a {}", whirlpool.token_mint_a.to_string());
  println!("whirlpool token_mint_b {}", whirlpool.token_mint_b.to_string());
  println!("whirlpool tick_spacing {}", whirlpool.tick_spacing);
  println!("whirlpool tick_current_index {}", whirlpool.tick_current_index);

  // get tickarray for swap
  let tick_arrays = poolutil_get_tick_array_pubkeys_for_swap(
    whirlpool.tick_current_index,
    whirlpool.tick_spacing,
    a_to_b,
    &ORCA_WHIRLPOOL_PROGRAM_ID,
    &SOL_USDC_WHIRLPOOL_ADDRESS,
  );
  println!("tick_arrays[0] {}", tick_arrays[0].to_string());
  println!("tick_arrays[1] {}", tick_arrays[1].to_string());
  println!("tick_arrays[2] {}", tick_arrays[2].to_string());

  let mut ta0_data: &[u8] = &client.get_account_data(&tick_arrays[0]).unwrap();
  let mut ta1_data: &[u8] = &client.get_account_data(&tick_arrays[1]).unwrap();
  let mut ta2_data: &[u8] = &client.get_account_data(&tick_arrays[2]).unwrap();
  let ta0 = TickArray::try_deserialize(&mut ta0_data).unwrap();
  let ta1 = TickArray::try_deserialize(&mut ta1_data).unwrap();
  let ta2 = TickArray::try_deserialize(&mut ta2_data).unwrap();

  println!("ta0 start_tick_index {}", ta0.start_tick_index);
  println!("ta1 start_tick_index {}", ta1.start_tick_index);
  println!("ta2 start_tick_index {}", ta2.start_tick_index);

  // get quote
  let [quote_sol_amount, quote_usdc_amount] = get_swap_quote(
    &whirlpool,
    [ta0, ta1, ta2],
    amount_in,
    true, // amount is input amount
    a_to_b,
  );

  println!("quote_sol_amount {}", quote_sol_amount);
  println!("quote_usdc_amount {}", quote_usdc_amount);
}

/*
SAMPLE OUTPUT:

$ cargo run
whirlpool token_mint_a So11111111111111111111111111111111111111112
whirlpool token_mint_b EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
whirlpool tick_spacing 64
whirlpool tick_current_index -30260
tick_arrays[0] 2Eh8HEeu45tCWxY6ruLLRN6VcTSD7bfshGj7bZA87Kne
tick_arrays[1] EVqGhR2ukNuqZNfvFFAitrX6UqrRm2r8ayKX9LH9xHzK
tick_arrays[2] C8o6QPGfuJD9XmNQY9ZTMXJE5qSDv4LHXaRA3D26GQ4M
ta0 start_tick_index -33792
ta1 start_tick_index -39424
ta2 start_tick_index -45056
quote_sol_amount 1000000000
quote_usdc_amount 48419688

*/