use anchor_lang::prelude::*;
use anchor_spl::{
  token::{TokenAccount, Token},
};
use whirlpool::{
  self,
  state::{Whirlpool, TickArray, Position},
  cpi::accounts::ModifyLiquidity,
  math::sqrt_price_from_tick_index,
  math::{mul_u256, U256Muldiv},
  manager::liquidity_manager::calculate_liquidity_token_deltas,
};
use solana_program::{pubkey::Pubkey};

declare_id!("n5PQ6mdMD3r6axuYoSdfzRVvYcJBwN68GLTTwEd6hva");

#[program]
pub mod cpi_whirlpool_increase_liquidity {
  use super::*;

  pub fn increase_liquidity(ctx: Context<DelegatedModifyLiquidity>) -> ProgramResult {
    // deposit 10.0 devSAMO
    let amount_dev_samo = 10_000_000_000u64;
    // block to deposit over 10.0 devUSDC
    let amount_dev_usdc_max = 10_000_000u64;

    let tick_index_lower = ctx.accounts.position.tick_lower_index;
    let tick_index_upper = ctx.accounts.position.tick_upper_index;
    let tick_index_current = ctx.accounts.whirlpool.tick_current_index;

    // assuming InRange status
    if tick_index_current < tick_index_lower || tick_index_upper <= tick_index_current {
      return Err(ErrorCode::OutOfRange.into());
    }

    let amount_a = amount_dev_samo as u128;
    let sqrt_price_lower_x64 = sqrt_price_from_tick_index(ctx.accounts.position.tick_lower_index);
    let sqrt_price_current_x64 = ctx.accounts.whirlpool.sqrt_price;
    let sqrt_price_upper_x64 = sqrt_price_from_tick_index(ctx.accounts.position.tick_upper_index);

    // get_liquidity_from_token_a is imported from whirlpools-sdk (getLiquidityFromTokenA)
    let liquidity = get_liquidity_from_token_a(amount_a, sqrt_price_current_x64, sqrt_price_upper_x64)?;
    let (token_max_a, token_max_b) = calculate_liquidity_token_deltas(
      tick_index_current,
      sqrt_price_current_x64,
      &ctx.accounts.position,
      liquidity as i128
    )?;

    msg!("tick_index_lower: {}", tick_index_lower);
    msg!("tick_index_upper: {}", tick_index_upper);
    msg!("tick_index_current: {}", tick_index_current);
    msg!("sqrt_price_lower_x64: {}", sqrt_price_lower_x64);
    msg!("sqrt_price_upper_x64: {}", sqrt_price_upper_x64);
    msg!("sqrt_price_current_x64: {}", sqrt_price_current_x64);
    msg!("liquidity: {}", liquidity);
    msg!("token_max_a: {}", token_max_a);
    msg!("token_max_b: {}", token_max_b);

    // block too much deposit
    if token_max_b > amount_dev_usdc_max {
      return Err(ErrorCode::TooMuchAmount.into());
    }

    // CPI
    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();
    let cpi_accounts = ModifyLiquidity {
      whirlpool: ctx.accounts.whirlpool.to_account_info(),
      position: ctx.accounts.position.to_account_info(),
      position_authority: ctx.accounts.position_authority.to_account_info(),
      position_token_account: ctx.accounts.position_token_account.to_account_info(),
      tick_array_lower: ctx.accounts.tick_array_lower.to_account_info(),
      tick_array_upper: ctx.accounts.tick_array_upper.to_account_info(),
      token_owner_account_a: ctx.accounts.token_owner_account_a.to_account_info(),
      token_owner_account_b: ctx.accounts.token_owner_account_b.to_account_info(),
      token_vault_a: ctx.accounts.token_vault_a.to_account_info(),
      token_vault_b: ctx.accounts.token_vault_b.to_account_info(),
      token_program: ctx.accounts.token_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
      cpi_program,
      cpi_accounts,
    );
    whirlpool::cpi::increase_liquidity(cpi_ctx, liquidity, token_max_a, token_max_b)?;

    Ok(())
  }
}


#[derive(Accounts)]
pub struct DelegatedModifyLiquidity<'info> {
  #[account(mut)]
  pub whirlpool: Account<'info, Whirlpool>,

  pub position_authority: Signer<'info>,

  #[account(mut, has_one = whirlpool)]
  pub position: Account<'info, Position>,
  #[account(
      constraint = position_token_account.mint == position.position_mint,
      constraint = position_token_account.amount == 1
  )]
  pub position_token_account: Box<Account<'info, TokenAccount>>,

  #[account(mut, constraint = token_owner_account_a.mint == whirlpool.token_mint_a)]
  pub token_owner_account_a: Box<Account<'info, TokenAccount>>,
  #[account(mut, constraint = token_owner_account_b.mint == whirlpool.token_mint_b)]
  pub token_owner_account_b: Box<Account<'info, TokenAccount>>,

  #[account(mut, constraint = token_vault_a.key() == whirlpool.token_vault_a)]
  pub token_vault_a: Box<Account<'info, TokenAccount>>,
  #[account(mut, constraint = token_vault_b.key() == whirlpool.token_vault_b)]
  pub token_vault_b: Box<Account<'info, TokenAccount>>,

  #[account(mut, has_one = whirlpool)]
  pub tick_array_lower: AccountLoader<'info, TickArray>,
  #[account(mut, has_one = whirlpool)]
  pub tick_array_upper: AccountLoader<'info, TickArray>,

  pub whirlpool_program: Program<'info, whirlpool::program::Whirlpool>,
  pub token_program: Program<'info, Token>,
}


#[error]
pub enum ErrorCode {
  OutOfRange,
  TooMuchAmount,
  WhirlpoolNumberDownCastError,
}


// LOGIC REFERENCE
// increaseLiquidityQuoteByInputTokenWithParams >> quotePositionInRange
// https://github.com/orca-so/whirlpools/blob/main/sdk/src/quotes/public/increase-liquidity-quote.ts#L167
// getLiquidityFromTokenA
// https://github.com/orca-so/whirlpools/blob/537306c096bcbbf9cb8d5cff337c989dcdd999b4/sdk/src/utils/position-util.ts#L69
fn get_liquidity_from_token_a(amount: u128, sqrt_price_lower_x64: u128, sqrt_price_upper_x64: u128 ) -> Result<u128> {
  // Δa = liquidity/sqrt_price_lower - liquidity/sqrt_price_upper
  // liquidity = Δa * ((sqrt_price_lower * sqrt_price_upper) / (sqrt_price_upper - sqrt_price_lower))
  assert!(sqrt_price_lower_x64 < sqrt_price_upper_x64);
  let sqrt_price_diff = sqrt_price_upper_x64 - sqrt_price_lower_x64;

  let numerator = mul_u256(sqrt_price_lower_x64, sqrt_price_upper_x64); // x64 * x64
  let denominator = U256Muldiv::new(0, sqrt_price_diff); // x64

  let (quotient, _remainder) = numerator.div(denominator, false);

  let liquidity = quotient
    .mul(U256Muldiv::new(0, amount))
    .shift_word_right()
    .try_into_u128()
    .or(Err(ErrorCode::WhirlpoolNumberDownCastError.into()));
  liquidity
}
// getLiquidityFromTokenB
// https://github.com/orca-so/whirlpools/blob/537306c096bcbbf9cb8d5cff337c989dcdd999b4/sdk/src/utils/position-util.ts#L86
fn _get_liquidity_from_token_b_not_implemented(_amount: u128, _sqrt_price_lower_x64: u128, _sqrt_price_upper_x64: u128 ) -> Result<u128> {
  // Leave to not take the opportunity to improve skills...
  Ok(0u128)
}


// to display println! : cargo test -- --nocapture
#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_get_liquidity_from_token_a() {
    let r0 = get_liquidity_from_token_a(
      100_000_000_000u128,
      58319427345345388u128,
      82674692782969588u128,
    ).unwrap();
    println!("r0 = {}", r0);
    assert_eq!(r0, 1073181681u128);
  }
}