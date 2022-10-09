use anchor_lang::prelude::*;

pub mod instructions;
use instructions::*;

// rewrite to your deployment keypair (including Anchor.toml)
declare_id!("EQ5S2YYiFYr5koc6EY1jRFkezp7nMePQJ5ad4QcrKhUy");

#[program]
pub mod with_anchor_v0_21_0 {
  use super::*;

  pub fn verify_whirlpools_config_account(
    ctx: Context<VerifyWhirlpoolsConfigAccount>,
  ) -> ProgramResult {
    return instructions::verify_account::handler_whirlpools_config(ctx);
  }

  pub fn verify_feetier_account(
    ctx: Context<VerifyFeeTierAccount>,
  ) -> ProgramResult {
    return instructions::verify_account::handler_feetier(ctx);
  }

  pub fn verify_whirlpool_account(
    ctx: Context<VerifyWhirlpoolAccount>,
  ) -> ProgramResult {
    return instructions::verify_account::handler_whirlpool(ctx);
  }

  pub fn verify_tickarray_account(
    ctx: Context<VerifyTickArrayAccount>,
    sampling1: u32,
    sampling2: u32,
    sampling3: u32,
    sampling4: u32,
    sampling5: u32,
    sampling6: u32,
    sampling7: u32,
    sampling8: u32,
  ) -> ProgramResult {
    return instructions::verify_account::handler_tickarray(
      ctx,
      sampling1, sampling2, sampling3, sampling4,
      sampling5, sampling6, sampling7, sampling8,
    );
  }

  pub fn verify_position_account(
    ctx: Context<VerifyPositionAccount>,
  ) -> ProgramResult {
    return instructions::verify_account::handler_position(ctx);
  }

  pub fn proxy_swap(
    ctx: Context<ProxySwap>,
    amount: u64,
    other_amount_threshold: u64,
    sqrt_price_limit: u128,
    amount_specified_is_input: bool,
    a_to_b: bool,
  ) -> ProgramResult {
    return instructions::proxy_swap::handler(
      ctx,
      amount,
      other_amount_threshold,
      sqrt_price_limit,
      amount_specified_is_input,
      a_to_b,
    );
  }

  pub fn proxy_open_position(
    ctx: Context<ProxyOpenPosition>,
    bumps: OpenPositionBumps,
    tick_lower_index: i32,
    tick_upper_index: i32,
  ) -> ProgramResult {
    return instructions::proxy_open_position::handler(
      ctx,
      bumps,
      tick_lower_index,
      tick_upper_index,
    );
  }

  pub fn proxy_increase_liquidity(
    ctx: Context<ProxyIncreaseLiquidity>,
    liquidity: u128,
    token_max_a: u64,
    token_max_b: u64,
  ) -> ProgramResult {
    return instructions::proxy_increase_liquidity::handler(
      ctx,
      liquidity,
      token_max_a,
      token_max_b,
    );
  }

  pub fn proxy_decrease_liquidity(
    ctx: Context<ProxyDecreaseLiquidity>,
    liquidity: u128,
    token_min_a: u64,
    token_min_b: u64,
  ) -> ProgramResult {
    return instructions::proxy_decrease_liquidity::handler(
      ctx,
      liquidity,
      token_min_a,
      token_min_b,
    );
  }

  pub fn proxy_update_fees_and_rewards(
    ctx: Context<ProxyUpdateFeesAndRewards>,
  ) -> ProgramResult {
    return instructions::proxy_update_fees_and_rewards::handler(
      ctx,
    );
  }

  pub fn proxy_collect_fees(
    ctx: Context<ProxyCollectFees>,
  ) -> ProgramResult {
    return instructions::proxy_collect_fees::handler(
      ctx,
    );
  }

  pub fn proxy_collect_reward(
    ctx: Context<ProxyCollectReward>,
    reward_index: u8,
  ) -> ProgramResult {
    return instructions::proxy_collect_reward::handler(
      ctx,
      reward_index,
    );
  }

  pub fn proxy_close_position(
    ctx: Context<ProxyClosePosition>,
  ) -> ProgramResult {
    return instructions::proxy_close_position::handler(
      ctx,
    );
  }
}

