use bigdecimal::{FromPrimitive, BigDecimal};
use num_bigint::BigInt;

use whirlpool::math::tick_math::{sqrt_price_from_tick_index, tick_index_from_sqrt_price};

use super::{q64_fixed_point_math, tick_util};

pub fn sqrt_price_x64_to_price(sqrt_price_x64: u128, decimals_a: i8, decimals_b: i8) -> BigDecimal {
  let sqrt_price_x64_decimal = BigDecimal::from_u128(sqrt_price_x64).unwrap();

  let shift_64 = BigDecimal::from(BigInt::from_u128(1u128 << 64).unwrap());
  let decimal_adjust = BigDecimal::from(BigInt::from_i8(10).unwrap().pow((decimals_a - decimals_b) as u32));

  let shifted = sqrt_price_x64_decimal / shift_64;
  let price = shifted.clone() * shifted.clone() * decimal_adjust;
  
  price
}

pub fn sqrt_price_x64_to_tick(sqrt_price_x64: u128) -> i32 {
  tick_index_from_sqrt_price(&sqrt_price_x64)
}

pub fn tick_index_to_sqrt_price_x64(tick_index: i32) -> u128 {
  sqrt_price_from_tick_index(tick_index)
}

pub fn tick_index_to_price(tick_index: i32, decimals_a: i8, decimals_b: i8) -> BigDecimal {
  let sqrt_price_x64 = tick_index_to_sqrt_price_x64(tick_index);
  sqrt_price_x64_to_price(sqrt_price_x64, decimals_a, decimals_b)
}

pub fn price_to_sqrt_price_x64(price: &BigDecimal, decimals_a: i8, decimals_b: i8) -> u128 {
  let decimal_adjust = BigDecimal::from(BigInt::from_i8(10).unwrap().pow((decimals_a - decimals_b) as u32));
  q64_fixed_point_math::decimal_to_u128((price / decimal_adjust).sqrt().unwrap())
}

pub fn price_to_tick_index(price: &BigDecimal, decimals_a: i8, decimals_b: i8) -> i32 {
  let sqrt_price_x64 = price_to_sqrt_price_x64(price, decimals_a, decimals_b);
  sqrt_price_x64_to_tick(sqrt_price_x64)
}

pub fn price_to_initializable_tick_index(price: &BigDecimal, decimals_a: i8, decimals_b: i8, tick_spacing: u16) -> i32 {
  let tick_index = price_to_tick_index(price, decimals_a, decimals_b);
  tick_util::get_initializable_tick_index(tick_index, tick_spacing)
}