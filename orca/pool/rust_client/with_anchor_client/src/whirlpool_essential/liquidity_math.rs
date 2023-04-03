//use rust_decimal::prelude::*;
//use rust_decimal::MathematicalOps;
use bigdecimal::{ToPrimitive, FromPrimitive, BigDecimal};
use num_bigint::BigInt;

pub struct TokenAmounts {
  pub token_a: u64,
  pub token_b: u64,
}

pub fn get_token_amounts_from_liquidity(
  liquidity: u128,
  sqrt_price_x64_current: u128,
  sqrt_price_x64_lower: u128,
  sqrt_price_x64_upper: u128,
  round_up: bool,
) -> TokenAmounts {
  let liq = BigDecimal::from_u128(liquidity).unwrap();
  let lower  = BigDecimal::from_u128(sqrt_price_x64_lower).unwrap();
  let upper = BigDecimal::from_u128(sqrt_price_x64_upper).unwrap();
  let current = BigDecimal::min(
    BigDecimal::max(
      BigDecimal::from_u128(sqrt_price_x64_current).unwrap(),
      lower.clone()),
    upper.clone()
  );

  let shift_64 = BigDecimal::from(BigInt::from_u128(1u128 << 64).unwrap());

  let token_a = liq.clone() * shift_64.clone() * (upper.clone() - current.clone()) / (current.clone() * upper.clone());
  let token_b = liq.clone() * (current.clone() - lower.clone()) / shift_64.clone();

  TokenAmounts {
    token_a: if !token_a.is_integer() && round_up { token_a.to_u64().unwrap() + 1 } else { token_a.to_u64().unwrap() },
    token_b: if !token_b.is_integer() && round_up { token_b.to_u64().unwrap() + 1 } else { token_b.to_u64().unwrap() },
  }
}

pub fn get_liquidity_from_token_a(
  sqrt_price_x64_0: u128,
  sqrt_price_x64_1: u128,
  amount: u64,
) -> u128 {
  let small_sqrt_price_x64 = BigInt::from_u128(u128::min(sqrt_price_x64_0, sqrt_price_x64_1)).unwrap();
  let large_sqrt_price_x64 = BigInt::from_u128(u128::max(sqrt_price_x64_0, sqrt_price_x64_1)).unwrap();
  if small_sqrt_price_x64 == large_sqrt_price_x64 {
    return 0u128;
  }

  let shift_64 = BigInt::from_u128(1u128 << 64).unwrap();
  let amount = BigInt::from_u64(amount).unwrap();
  let num = amount * (small_sqrt_price_x64.clone() * large_sqrt_price_x64.clone());
  let sub = large_sqrt_price_x64.checked_sub(&small_sqrt_price_x64).unwrap();
  let denom = shift_64.checked_mul(&sub).unwrap();
  num.checked_div(&denom).unwrap().to_u128().unwrap()
}

pub fn get_liquidity_from_token_b(
  sqrt_price_x64_0: u128,
  sqrt_price_x64_1: u128,
  amount: u64,
) -> u128 {
  let small_sqrt_price_x64 = BigInt::from_u128(u128::min(sqrt_price_x64_0, sqrt_price_x64_1)).unwrap();
  let large_sqrt_price_x64 = BigInt::from_u128(u128::max(sqrt_price_x64_0, sqrt_price_x64_1)).unwrap();
  if small_sqrt_price_x64 == large_sqrt_price_x64 {
    return 0u128;
  }

  let shift_64 = BigInt::from_u128(1u128 << 64).unwrap();
  let amount = BigInt::from_u64(amount).unwrap();
  let num = amount * shift_64;
  let denom = large_sqrt_price_x64.checked_sub(&small_sqrt_price_x64).unwrap();
  num.checked_div(&denom).unwrap().to_u128().unwrap()
}
