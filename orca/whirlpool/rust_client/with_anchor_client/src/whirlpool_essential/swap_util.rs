use anchor_client::solana_sdk::pubkey::Pubkey;
use whirlpool::math::tick_math::{MAX_SQRT_PRICE_X64, MIN_SQRT_PRICE_X64};

use super::{pda_util, tick_util};

pub fn get_tick_array_pubkeys(
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
      let start_tick_index = tick_util::get_start_tick_index(tick_current_index + shifted, tick_spacing, offset);
      let tick_array_pubkey = pda_util::get_tick_array(program_id, whirlpool_pubkey, start_tick_index).pubkey;
      pubkeys[i] = tick_array_pubkey;
      offset = if a_to_b { offset - 1 } else { offset + 1 };
  }

  pubkeys
}

pub fn get_default_sqrt_price_limit(a_to_b: bool) -> u128 {
  if a_to_b {
      MIN_SQRT_PRICE_X64
  } else {
      MAX_SQRT_PRICE_X64
  }
}
