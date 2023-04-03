use bigdecimal::{ToPrimitive, FromPrimitive, BigDecimal};
use num_bigint::BigInt;

pub fn decimal_to_u128(decimal: BigDecimal) -> u128 {
  let shift_64 = BigDecimal::from(BigInt::from_u128(1u128 << 64).unwrap());
  (decimal * shift_64).to_u128().unwrap()
}