use solana_client::{rpc_client::RpcClient};
use solana_sdk::{
    pubkey::Pubkey,
    commitment_config::CommitmentConfig,
    signature::{read_keypair_file, Keypair},
};
use solana_client_helpers::{Client};
use std::{str::FromStr};
use anchor_lang::prelude::*;
use rust_decimal::prelude::*;
use rust_decimal::MathematicalOps;
use whirlpool::{
  state::Whirlpool,
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
  let url = "https://api.mainnet-beta.solana.com";
  let connection = RpcClient::new_with_commitment(url.to_string(), CommitmentConfig::confirmed());

  // Load your wallet account from filesystem (from default location)
  // let wallet = read_keypair_file(&*shellexpand::tilde("~/.config/solana/id.json")).expect("Example requires a keypair file");

  // temporary
  let wallet = Keypair::new();

  // helper client
  let client = Client { client: connection, payer: wallet };

  // pool & swap input
  let SOL_USDC_WHIRLPOOL_ADDRESS = Pubkey::from_str("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ").unwrap();
  let SOL_DECIMALS = 9i8;
  let USDC_DECIMALS = 6i8;

  // get whirlpool
  let mut whirlpool_data: &[u8] = &client.get_account_data(&SOL_USDC_WHIRLPOOL_ADDRESS).unwrap();
  let whirlpool = Whirlpool::try_deserialize(&mut whirlpool_data).unwrap();

  println!("whirlpool token_mint_a {}", whirlpool.token_mint_a.to_string());
  println!("whirlpool token_mint_b {}", whirlpool.token_mint_b.to_string());
  println!("whirlpool tick_spacing {}", whirlpool.tick_spacing);
  println!("whirlpool tick_current_index {}", whirlpool.tick_current_index);
  println!("whirlpool sqrt_price {}", whirlpool.sqrt_price);

  // calcu price with rust_decimal crate (at client-side)
  println!("whirlpool price {}", pricemath_sqrt_price_x64_to_price(whirlpool.sqrt_price, SOL_DECIMALS, USDC_DECIMALS));
}

/*
SAMPLE OUTPUT:

$ cargo run
whirlpool token_mint_a So11111111111111111111111111111111111111112
whirlpool token_mint_b EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
whirlpool tick_spacing 64
whirlpool tick_current_index -33748
whirlpool sqrt_price 3413053520007066126
whirlpool price 34.233141246308390936526680400

*/
