use anchor_client::solana_sdk::commitment_config::CommitmentConfig;
use anchor_client::solana_sdk::pubkey::Pubkey;
use anchor_client::solana_sdk::signature::read_keypair_file;
use anchor_client::solana_sdk::signature::Signer;
use anchor_client::{Client as AnchorClient, Cluster};
use solana_client::rpc_client::RpcClient;
use solana_client_helpers::Client as SolanaClient;
use solana_sdk::pubkey;
use spl_token::ID as TOKEN_PROGRAM_ID;
use spl_associated_token_account::get_associated_token_address;
use anchor_lang::prelude::*;
use with_anchor_v0_20_1;
use anyhow::Result;
use std::rc::Rc;
use std::cell::RefCell;

// use Whirlpool as crate
use whirlpool::{
  state::{Whirlpool, TickArray, TICK_ARRAY_SIZE, MAX_TICK_INDEX, MIN_TICK_INDEX},
  manager::swap_manager::swap,
  util::swap_tick_sequence::SwapTickSequence,
  math::tick_math::{MIN_SQRT_PRICE_X64, MAX_SQRT_PRICE_X64},
};

const ORCA_WHIRLPOOL_PROGRAM_ID: Pubkey = pubkey!("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc");

// SAMO/USDC(64) whirlpool need to be cloned on local-validator
const SAMO_USDC_WHIRLPOOL_ADDRESS: Pubkey = pubkey!("9vqYJjDUFecLL2xPUC4Rc7hyCtZ6iJ4mDiVZX7aFXoAe");

// Reference: https://github.com/coral-xyz/anchor/blob/master/client/example/src/main.rs
fn main() -> Result<()> {
  let rpc_endpoint_url = "http://localhost:8899";
  let rpc_ws_endpoint_url = "ws://localhost:8900";

  // load wallet
  let payer = read_keypair_file(&*shellexpand::tilde("~/.config/solana/id.json"))
      .expect("Example requires a keypair file");

  let payer_pubkey = payer.pubkey().clone();

  // build Solana client
  let connection = RpcClient::new_with_commitment(rpc_endpoint_url.to_string(), CommitmentConfig::confirmed());
  let solana_client = SolanaClient { client: connection, payer };

  // swap input
  let a_to_b = true;
  let amount_in = 1_000_000_000u64; // 1 SAMO

  // get whirlpool
  let mut whirlpool_data: &[u8] = &solana_client.get_account_data(&SAMO_USDC_WHIRLPOOL_ADDRESS).unwrap();
  let whirlpool = Whirlpool::try_deserialize(&mut whirlpool_data).unwrap();

  println!("whirlpool token_mint_a {}", whirlpool.token_mint_a.to_string());
  println!("whirlpool token_mint_b {}", whirlpool.token_mint_b.to_string());
  println!("whirlpool token_vault_a {}", whirlpool.token_vault_a.to_string());
  println!("whirlpool token_vault_b {}", whirlpool.token_vault_b.to_string());
  println!("whirlpool tick_spacing {}", whirlpool.tick_spacing);
  println!("whirlpool tick_current_index {}", whirlpool.tick_current_index);
  println!("whirlpool sqrt_price {}", whirlpool.sqrt_price);

  // get tickarray for swap
  let tick_arrays = poolutil_get_tick_array_pubkeys_for_swap(
    whirlpool.tick_current_index,
    whirlpool.tick_spacing,
    a_to_b,
    &ORCA_WHIRLPOOL_PROGRAM_ID,
    &SAMO_USDC_WHIRLPOOL_ADDRESS,
  );
  let mut ta0_data: &[u8] = &solana_client.get_account_data(&tick_arrays[0]).unwrap();
  let mut ta1_data: &[u8] = &solana_client.get_account_data(&tick_arrays[1]).unwrap();
  let mut ta2_data: &[u8] = &solana_client.get_account_data(&tick_arrays[2]).unwrap();
  let ta0 = TickArray::try_deserialize(&mut ta0_data).unwrap();
  let ta1 = TickArray::try_deserialize(&mut ta1_data).unwrap();
  let ta2 = TickArray::try_deserialize(&mut ta2_data).unwrap();

  println!("tick_arrays[0] {}", tick_arrays[0].to_string());
  println!("tick_arrays[1] {}", tick_arrays[1].to_string());
  println!("tick_arrays[2] {}", tick_arrays[2].to_string());

  // get quote
  let [quote_amount_in, quote_amount_out] = get_swap_quote(
    &whirlpool,
    [ta0, ta1, ta2],
    amount_in,
    true, // amount is input amount
    a_to_b,
  );
  let amount_out = calc_slippage(quote_amount_out, 1, 100); // 1%
  println!("quote amount_in {}", quote_amount_in);
  println!("quote amount_out {}", quote_amount_out);
  println!("amount_out (slippage included) {}", amount_out);

  // get oracle
  let oracle = pdautil_get_oracle(&ORCA_WHIRLPOOL_PROGRAM_ID, &SAMO_USDC_WHIRLPOOL_ADDRESS);
  println!("oracle {}", oracle.to_string());

  // get ATA
  // - Assume that the ATA has already been created
  // - If one token of pair is SOL, the WSOL account must be processed (avoid SOL in this example)
  let ata_a = get_associated_token_address(&payer_pubkey, &whirlpool.token_mint_a);
  let ata_b = get_associated_token_address(&payer_pubkey, &whirlpool.token_mint_b);
  println!("ata_a {}", ata_a.to_string());
  println!("ata_b {}", ata_b.to_string());

  // build Anchor client
  let cluster = Cluster::Custom(rpc_endpoint_url.to_string(), rpc_ws_endpoint_url.to_string());
  let anchor_client = AnchorClient::new_with_options(cluster, Rc::new(solana_client.payer), CommitmentConfig::confirmed());
  let program = anchor_client.program(with_anchor_v0_20_1::id());

  // execute proxy_swap
  let signature = program
    .request()
    .accounts(with_anchor_v0_20_1::accounts::ProxySwap {
      whirlpool_program: ORCA_WHIRLPOOL_PROGRAM_ID,
      whirlpool: SAMO_USDC_WHIRLPOOL_ADDRESS,
      token_program: TOKEN_PROGRAM_ID,
      token_authority: payer_pubkey,
      token_owner_account_a: ata_a,
      token_owner_account_b: ata_b,
      token_vault_a: whirlpool.token_vault_a,
      token_vault_b: whirlpool.token_vault_b,
      tick_array_0: tick_arrays[0],
      tick_array_1: tick_arrays[1],
      tick_array_2: tick_arrays[2],
      oracle,
    })
    .args(with_anchor_v0_20_1::instruction::ProxySwap {
      a_to_b,
      amount_specified_is_input: true,
      other_amount_threshold: amount_out,
      sqrt_price_limit: MIN_SQRT_PRICE_X64, // a to b
      amount: amount_in,
    })
    .send()?;
  
  println!("signagure {}", signature.to_string());

  Ok(())
}


fn div_floor(a: i32, b: i32) -> i32 {
  if a < 0 && a%b != 0 { a / b - 1 } else { a / b }
}

fn tickutil_get_start_tick_index(tick_current_index: i32, tick_spacing: u16, offset: i32) -> i32 {
  let ticks_in_array = TICK_ARRAY_SIZE * tick_spacing as i32;
  let real_index = div_floor(tick_current_index, ticks_in_array);
  let start_tick_index = (real_index + offset) * ticks_in_array;

  assert!(MIN_TICK_INDEX <= start_tick_index);
  assert!(start_tick_index + ticks_in_array <= MAX_TICK_INDEX);
  start_tick_index
}

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

fn poolutil_get_tick_array_pubkeys_for_swap(
  tick_current_index: i32,
  tick_spacing: u16,
  a_to_b: bool,
  program_id: &Pubkey,
  whirlpool_pubkey: &Pubkey,
) -> [Pubkey; 3] {
  let mut offset = 0;
  let mut pubkeys: [Pubkey; 3] = Default::default();
  let shifted = if a_to_b { 0i32 } else { tick_spacing as i32 };

  for i in 0..pubkeys.len() {
    let start_tick_index = tickutil_get_start_tick_index(tick_current_index + shifted, tick_spacing, offset);
    let tick_array_pubkey = pdautil_get_tick_array(program_id, whirlpool_pubkey, start_tick_index);
    pubkeys[i] = tick_array_pubkey;
    offset = if a_to_b { offset - 1 } else { offset + 1 };
  }

  pubkeys
}

fn pdautil_get_oracle(program_id: &Pubkey, whirlpool_pubkey: &Pubkey) -> Pubkey {
  let seeds = [
    b"oracle",
    whirlpool_pubkey.as_ref(),
  ];
  let (pubkey, _bump) = Pubkey::find_program_address(&seeds, program_id);
  pubkey
}

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

  // dummy
  let timestamp = whirlpool.reward_last_updated_timestamp;
  let sqrt_price_limit = if a_to_b { MIN_SQRT_PRICE_X64 } else { MAX_SQRT_PRICE_X64 };

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

fn calc_slippage(amount: u64, slippage_num: u64, slippage_denom: u64) -> u64 {
  let num = (slippage_denom - slippage_num) as u128;
  let denom = slippage_denom as u128;
  u64::try_from((amount as u128) * num / denom).unwrap()
}


/*

$ cargo run
whirlpool token_mint_a 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
whirlpool token_mint_b EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
whirlpool token_vault_a 3xxgYc3jXPdjqpMdrRyKtcddh4ZdtqpaN33fwaWJ2Wbh
whirlpool token_vault_b 8xKCx3SGwWR6BUr9mZFm3xwZmCVMuLjXn9iLEU6784FS
whirlpool tick_spacing 64
whirlpool tick_current_index -110930
whirlpool sqrt_price 71983179958362884
tick_arrays[0] CHVTbSXJ3W1XEjQXx7BhV2ZSfzmQcbZzKTGZa6ph6BoH
tick_arrays[1] 4xM1zPj8ihLFUs2DvptGVZKkdACSZgNaa8zpBTApNk9G
tick_arrays[2] Gad6jpBXSxFmSqcPSPTE9jABp9ragNc2VsdUCNWLEAMT
quote amount_in 1000000000
quote amount_out 15196
amount_out (slippage included) 15044
oracle 5HyJnjQ4XTSVXUS2Q8Ef6VCVwnXGnHE2WTwq7iSaZJez
ata_a 6dM4iMgSei6zF9y3sqdgSJ2xwNXML5wk5QKhV4DqJPhu
ata_b FbQdXCQgGQYj3xcGeryVVFjKCTsAuu53vmCRtmjQEqM5
signagure ZzNQ51gDYjx3FFbDdKxDaZarPzhiW8GL8Lvr9CPXXRZUoxdiNGWPhpXKTPuRUDWbCgG3w6S7VX22mQCFZRhX7m2

*/