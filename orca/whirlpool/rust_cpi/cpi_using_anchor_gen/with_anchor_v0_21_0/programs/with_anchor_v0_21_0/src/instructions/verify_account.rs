use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};
use whirlpools::{self, state::{WhirlpoolsConfig, FeeTier, Whirlpool, TickArray, Position}};

#[derive(Accounts)]
pub struct VerifyWhirlpoolsConfigAccount<'info> {
  pub whirlpools_config: Box<Account<'info, WhirlpoolsConfig>>,
}

#[derive(Accounts)]
pub struct VerifyFeeTierAccount<'info> {
  pub feetier: Box<Account<'info, FeeTier>>,
}

#[derive(Accounts)]
pub struct VerifyWhirlpoolAccount<'info> {
  pub whirlpool: Box<Account<'info, Whirlpool>>,
}

#[derive(Accounts)]
pub struct VerifyTickArrayAccount<'info> {
  pub tickarray: AccountLoader<'info, TickArray>,
}

#[derive(Accounts)]
pub struct VerifyPositionAccount<'info> {
  pub position: Box<Account<'info, Position>>,
}

pub fn handler_whirlpools_config(
  ctx: Context<VerifyWhirlpoolsConfigAccount>,
) -> ProgramResult {
  let config = &ctx.accounts.whirlpools_config;

  // dump whirlpools config account
  msg!("verify! fee_authority: {}", config.fee_authority);
  msg!("verify! collect_protocol_fees_authority: {}", config.collect_protocol_fees_authority);
  msg!("verify! reward_emissions_super_authority: {}", config.reward_emissions_super_authority);
  msg!("verify! default_protocol_fee_rate: {}", config.default_protocol_fee_rate);
  
  Ok(())
}

pub fn handler_feetier(
  ctx: Context<VerifyFeeTierAccount>,
) -> ProgramResult {
  let feetier = &ctx.accounts.feetier;

  // dump feetier account
  msg!("verify! whirlpools_config: {}", feetier.whirlpools_config);
  msg!("verify! tick_spacing: {}", feetier.tick_spacing);
  msg!("verify! default_fee_rate: {}", feetier.default_fee_rate);

  Ok(())
}

pub fn handler_whirlpool(
  ctx: Context<VerifyWhirlpoolAccount>,
) -> ProgramResult {
  let whirlpool = &ctx.accounts.whirlpool;

  // dump whirlpool account
  msg!("verify! whirlpools_config: {}", whirlpool.whirlpools_config);
  msg!("verify! whirlpool_bump: {}", whirlpool.whirlpool_bump[0]);
  msg!("verify! tick_spacing: {}", whirlpool.tick_spacing);
  msg!("verify! tick_spacing_seed: {} {}", whirlpool.tick_spacing_seed[0], whirlpool.tick_spacing_seed[1]);
  msg!("verify! fee_rate: {}", whirlpool.fee_rate);
  msg!("verify! protocol_fee_rate: {}", whirlpool.protocol_fee_rate);
  msg!("verify! liquidity: {}", whirlpool.liquidity);
  msg!("verify! sqrt_price: {}", whirlpool.sqrt_price);
  msg!("verify! tick_current_index: {}", whirlpool.tick_current_index);
  msg!("verify! protocol_fee_owed_a: {}", whirlpool.protocol_fee_owed_a);
  msg!("verify! protocol_fee_owed_b: {}", whirlpool.protocol_fee_owed_b);
  msg!("verify! token_mint_a: {}", whirlpool.token_mint_a);
  msg!("verify! token_vault_a: {}", whirlpool.token_vault_a);
  msg!("verify! fee_growth_global_a: {}", whirlpool.fee_growth_global_a);
  msg!("verify! token_mint_b: {}", whirlpool.token_mint_b);
  msg!("verify! token_vault_b: {}", whirlpool.token_vault_b);
  msg!("verify! fee_growth_global_b: {}", whirlpool.fee_growth_global_b);
  msg!("verify! reward_last_updated_timestamp: {}", whirlpool.reward_last_updated_timestamp);
  msg!("verify! reward_infos[0].mint: {}", whirlpool.reward_infos[0].mint);
  msg!("verify! reward_infos[0].vault: {}", whirlpool.reward_infos[0].vault);
  msg!("verify! reward_infos[0].authority: {}", whirlpool.reward_infos[0].authority);
  msg!("verify! reward_infos[0].emissions_per_second_x64: {}", whirlpool.reward_infos[0].emissions_per_second_x64);
  msg!("verify! reward_infos[0].growth_global_x64: {}", whirlpool.reward_infos[0].growth_global_x64);
  msg!("verify! reward_infos[1].mint: {}", whirlpool.reward_infos[1].mint);
  msg!("verify! reward_infos[1].vault: {}", whirlpool.reward_infos[1].vault);
  msg!("verify! reward_infos[1].authority: {}", whirlpool.reward_infos[1].authority);
  msg!("verify! reward_infos[1].emissions_per_second_x64: {}", whirlpool.reward_infos[1].emissions_per_second_x64);
  msg!("verify! reward_infos[1].growth_global_x64: {}", whirlpool.reward_infos[1].growth_global_x64);
  msg!("verify! reward_infos[2].mint: {}", whirlpool.reward_infos[2].mint);
  msg!("verify! reward_infos[2].vault: {}", whirlpool.reward_infos[2].vault);
  msg!("verify! reward_infos[2].authority: {}", whirlpool.reward_infos[2].authority);
  msg!("verify! reward_infos[2].emissions_per_second_x64: {}", whirlpool.reward_infos[2].emissions_per_second_x64);
  msg!("verify! reward_infos[2].growth_global_x64: {}", whirlpool.reward_infos[2].growth_global_x64);

  Ok(())
}

pub fn handler_tickarray(
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
  let tickarray = ctx.accounts.tickarray.load()?;

  // dump tickarray account
  msg!("verify! whirlpool: {}", tickarray.whirlpool);
  msg!("verify! start_tick_index: {}", tickarray.start_tick_index);

  let indexes = [
    sampling1, sampling2, sampling3, sampling4,
    sampling5, sampling6, sampling7, sampling8,
  ];
  for i in 0..indexes.len() {
    let index = indexes[i] as usize;
    let tick = tickarray.ticks[index];
    msg!("verify! ticks[{}].initialized: {}", index, tick.initialized);
    msg!("verify! ticks[{}].liquidity_net: {}", index, tick.liquidity_net);
    msg!("verify! ticks[{}].liquidity_gross: {}", index, tick.liquidity_gross);
    msg!("verify! ticks[{}].fee_growth_outside_a: {}", index, tick.fee_growth_outside_a);
    msg!("verify! ticks[{}].fee_growth_outside_b: {}", index, tick.fee_growth_outside_b);
    msg!("verify! ticks[{}].reward_growths_outside[0]: {}", index, tick.reward_growths_outside[0]);
    msg!("verify! ticks[{}].reward_growths_outside[1]: {}", index, tick.reward_growths_outside[1]);
    msg!("verify! ticks[{}].reward_growths_outside[2]: {}", index, tick.reward_growths_outside[2]);
  }

  Ok(())
}

pub fn handler_position(
  ctx: Context<VerifyPositionAccount>,
) -> ProgramResult {
  let position = &ctx.accounts.position;

  // dump position account
  msg!("verify! whirlpool: {}", position.whirlpool);
  msg!("verify! position_mint: {}", position.position_mint);
  msg!("verify! liquidity: {}", position.liquidity);
  msg!("verify! tick_lower_index: {}", position.tick_lower_index);
  msg!("verify! tick_upper_index: {}", position.tick_upper_index);
  msg!("verify! fee_growth_checkpoint_a: {}", position.fee_growth_checkpoint_a);
  msg!("verify! fee_owed_a: {}", position.fee_owed_a);
  msg!("verify! fee_growth_checkpoint_b: {}", position.fee_growth_checkpoint_b);
  msg!("verify! fee_owed_b: {}", position.fee_owed_b);
  msg!("verify! reward_infos[0].growth_inside_checkpoint: {}", position.reward_infos[0].growth_inside_checkpoint);
  msg!("verify! reward_infos[0].amount_owed: {}", position.reward_infos[0].amount_owed);
  msg!("verify! reward_infos[1].growth_inside_checkpoint: {}", position.reward_infos[1].growth_inside_checkpoint);
  msg!("verify! reward_infos[1].amount_owed: {}", position.reward_infos[1].amount_owed);
  msg!("verify! reward_infos[2].growth_inside_checkpoint: {}", position.reward_infos[2].growth_inside_checkpoint);
  msg!("verify! reward_infos[2].amount_owed: {}", position.reward_infos[2].amount_owed);

  Ok(())
}