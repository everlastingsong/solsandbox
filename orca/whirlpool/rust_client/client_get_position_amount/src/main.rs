use solana_client::{rpc_client::RpcClient};
use solana_sdk::{
    pubkey::Pubkey,
    commitment_config::CommitmentConfig,
    signature::{Keypair},
};
use solana_client_helpers::{Client};
use std::{str::FromStr};
use anchor_lang::prelude::*;
use rust_decimal::prelude::*;
use rust_decimal::MathematicalOps;
use std::cmp::{max, min};

// use Whirlpool as crate
use whirlpool::{
  state::{Whirlpool, Position},
  math::tick_math::{sqrt_price_from_tick_index},
  math::token_math::{get_amount_delta_a, get_amount_delta_b},
};

// https://orca-so.github.io/whirlpools/classes/PriceMath.html#sqrtPriceX64ToPrice
// https://github.com/orca-so/whirlpools/blob/main/sdk/src/utils/public/price-math.ts#L22
fn pricemath_sqrt_price_x64_to_price(sqrt_price_x64: u128, decimals_a: i8, decimals_b: i8) -> String {
  let sqrt_price_x64_decimal = Decimal::from_str(&sqrt_price_x64.to_string()).unwrap();

  let price = sqrt_price_x64_decimal
    .checked_div(Decimal::TWO.powu(64)).unwrap()
    .powu(2)
    .checked_mul(Decimal::TEN.powi((decimals_a - decimals_b) as i64)).unwrap();
  
  price.to_string()
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
  let SOL_DECIMALS = 9i8;
  let USDC_DECIMALS = 6i8;

  // position input
  let MY_POSITION = Pubkey::from_str("5j3szbi2vnydYoyALNgttPD9YhCNwshUGkhzmzaP4WF7").unwrap();

  // get whirlpool
  let mut whirlpool_data: &[u8] = &client.get_account_data(&SOL_USDC_WHIRLPOOL_ADDRESS).unwrap();
  let whirlpool = Whirlpool::try_deserialize(&mut whirlpool_data).unwrap();

  println!("whirlpool token_mint_a {}", whirlpool.token_mint_a.to_string());
  println!("whirlpool token_mint_b {}", whirlpool.token_mint_b.to_string());
  println!("whirlpool tick_spacing {}", whirlpool.tick_spacing);
  println!("whirlpool tick_current_index {}", whirlpool.tick_current_index);
  println!("whirlpool sqrt_price {}", whirlpool.sqrt_price);
  println!("whirlpool price {}", pricemath_sqrt_price_x64_to_price(whirlpool.sqrt_price, SOL_DECIMALS, USDC_DECIMALS));

  // get position
  let mut position_data: &[u8] = &client.get_account_data(&MY_POSITION).unwrap();
  let position = Position::try_deserialize(&mut position_data).unwrap();

  println!("position lower_index {}", position.tick_lower_index);
  println!("position upper_index {}", position.tick_upper_index);
  println!("position liquidity {}", position.liquidity);

  // calc token amount
  let sqrt_price_lower = sqrt_price_from_tick_index(position.tick_lower_index);
  let sqrt_price_upper = sqrt_price_from_tick_index(position.tick_upper_index);
  // bound out-or-range price (sqrt_price_lower <= sqrt_price_current <= sqrt_price_upper)
  let sqrt_price_current = min(max(whirlpool.sqrt_price, sqrt_price_lower), sqrt_price_upper);

  let position_amount_a = get_amount_delta_a(sqrt_price_current, sqrt_price_upper, position.liquidity, true).unwrap();
  let position_amount_b = get_amount_delta_b(sqrt_price_lower, sqrt_price_current, position.liquidity, true).unwrap();

  // no slippage amount
  println!("position amount_a {}", position_amount_a);
  println!("position amount_b {}", position_amount_b);
}

