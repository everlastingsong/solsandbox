use anchor_lang::prelude::*;
use anchor_spl::{
  token::{Mint, TokenAccount, Token},
  associated_token::AssociatedToken,
};
use whirlpool::{
  self,
  state::{Whirlpool, TickArray},
  cpi::accounts::Swap,
  math::sqrt_price_from_tick_index,
};
use std::cmp;
use solana_program::{pubkey, pubkey::Pubkey};
use solana_program::sysvar::instructions;

declare_id!("GKmRtfNxom1xKR6t1NGYZTEkz19xMhT1cGx143vG3UCh");

const ADMIN_PUBKEY: Pubkey = pubkey!("r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6");
const SNOWFLAKE_PROGRAM_PUBKEY: Pubkey = pubkey!("BiVwqu45yQTxqTTTAD1UrMZNyZ3qsEVqKwTEfG9BvUs6");
const SNOWFLAKE_ADMIN_FUND_PUBKEY: Pubkey = pubkey!("7fWL9YzocWAMyMHAnpWNHVEszVs2Sj5qw3ygxGkdDE4g");

#[program]
pub mod dev_token_swapper {
  use super::*;

  // create ATA
  pub fn initialize_token_account(_ctx: Context<InitializeTokenAccount>, _bump: u8) -> ProgramResult {
    // Anchor does everything needed as pre-process!
    Ok(())
  }

  // swap to make current_tick_index close to target_tick_index
  pub fn push_back_swap(ctx: Context<PushBackSwap>, bump: u8, target_tick_index: i32, amount_a: u64, amount_b: u64) -> ProgramResult {
    authenticate(&ctx)?;

    let tick_arrays = [
      ctx.accounts.tick_array_0.load().unwrap(),
      ctx.accounts.tick_array_1.load().unwrap(),
      ctx.accounts.tick_array_2.load().unwrap(),
      ctx.accounts.tick_array_3.load().unwrap(),
      ctx.accounts.tick_array_4.load().unwrap(),
      ctx.accounts.tick_array_5.load().unwrap(),
      ctx.accounts.tick_array_6.load().unwrap(),
    ];

    // determine swap direction
    let current_tick_index = ctx.accounts.whirlpool.tick_current_index;
    let a_to_b = target_tick_index <= current_tick_index;

    // find tickarray which contains current_tick_index
    let current_tick_array = match tick_arrays.iter().position(|ta| ta.check_in_array_bounds(current_tick_index, ctx.accounts.whirlpool.tick_spacing)) {
      Some(current_tick_array) => current_tick_array as i32,
      None => return Err(ErrorCode::CurrentTickArrayNotFound.into()),
    };

    // choose tickarrays of swap instruction
    let lbound = 0;
    let ubound = tick_arrays.len() as i32 - 1;
    let input_tick_arrays = if a_to_b {
      [current_tick_array, cmp::max(current_tick_array-1, lbound), cmp::max(current_tick_array-2, lbound)]
    } else {
      [current_tick_array, cmp::min(current_tick_array+1, ubound), cmp::min(current_tick_array+2, ubound)]
    };

    // determine input amount
    let input_amount = if a_to_b { amount_a } else { amount_b };

    // to avoid large price change, max change of tick_index is limited to tick_spacing
    // amount_a and amount_b should be determined to satisfy this constraint
    let sqrt_price_limit = if a_to_b {
      sqrt_price_from_tick_index(current_tick_index - ctx.accounts.whirlpool.tick_spacing as i32)
    } else {
      sqrt_price_from_tick_index(current_tick_index + ctx.accounts.whirlpool.tick_spacing as i32)
    };

    msg!("current_tick_index: {}", current_tick_index);
    msg!("target_tick_index: {}", target_tick_index);
    msg!("a_to_b: {}", a_to_b);
    msg!("input_amount: {}", input_amount);
    msg!("current_tick_array: {}", current_tick_array);
    msg!("input_tick_arrays[0]: {}", input_tick_arrays[0]);
    msg!("input_tick_arrays[1]: {}", input_tick_arrays[1]);
    msg!("input_tick_arrays[2]: {}", input_tick_arrays[2]);
    msg!("liquidity: {}", ctx.accounts.whirlpool.liquidity);
    msg!("sqrt_price_limit: {}", sqrt_price_limit);
    msg!("token_account_a: {}", ctx.accounts.token_owner_account_a.amount);
    msg!("token_account_b: {}", ctx.accounts.token_owner_account_b.amount);

    // to avoid the following error at "ctx_accounts_tick_arrays[input_tick_arrays[i] as usize].to_account_info(),"
    // Program log: Failed to borrow a reference to account data, already borrowed
    drop(tick_arrays);
    
    // CPI for swap instruction of whirlpool
    let ctx_accounts_tick_arrays = [
      &ctx.accounts.tick_array_0,
      &ctx.accounts.tick_array_1,
      &ctx.accounts.tick_array_2,
      &ctx.accounts.tick_array_3,
      &ctx.accounts.tick_array_4,
      &ctx.accounts.tick_array_5,
      &ctx.accounts.tick_array_6,      
    ];

    let authority_seeds = [b"authority".as_ref(), &[bump]];
    let signer_seeds = [authority_seeds.as_ref()];

    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();
    let cpi_accounts = Swap {
      whirlpool: ctx.accounts.whirlpool.to_account_info(),
      token_authority: ctx.accounts.authority.to_account_info(),
      token_owner_account_a: ctx.accounts.token_owner_account_a.to_account_info(),
      token_vault_a: ctx.accounts.token_vault_a.to_account_info(),
      token_owner_account_b: ctx.accounts.token_owner_account_b.to_account_info(),
      token_vault_b: ctx.accounts.token_vault_b.to_account_info(),
      tick_array_0: ctx_accounts_tick_arrays[input_tick_arrays[0] as usize].to_account_info(),
      tick_array_1: ctx_accounts_tick_arrays[input_tick_arrays[1] as usize].to_account_info(),
      tick_array_2: ctx_accounts_tick_arrays[input_tick_arrays[2] as usize].to_account_info(),
      oracle: ctx.accounts.oracle.to_account_info(),
      token_program: ctx.accounts.token_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
      cpi_program,
      cpi_accounts,
      &signer_seeds,
    );

    whirlpool::cpi::swap(
      cpi_ctx,
      input_amount,
      0,
      sqrt_price_limit,
      true,
      a_to_b
    )?;

    Ok(())
  }
}

fn authenticate(ctx: &Context<PushBackSwap>) -> ProgramResult {
  // case1. ADMIN_PUBKEY signed the transaction (double-check because address constraint is also used)
  if ctx.accounts.authenticator.key() == ADMIN_PUBKEY && ctx.accounts.authenticator.is_signer { return Ok(()) };

  // case2. executed by Snowflake using my SOL fund account
  // https://docs.solana.com/implemented-proposals/instruction_introspection
  let current_index = instructions::load_current_index_checked(&ctx.accounts.instructions.to_account_info())?;
  let current_instruction = instructions::load_instruction_at_checked(current_index as usize, &ctx.accounts.instructions.to_account_info())?;
  msg!("authenticate current_index: {}", current_index);
  msg!("authenticate current_instruction.program_id: {}", current_instruction.program_id);
  msg!("authenticate current_instruction.accounts[1].pubkey: {}", current_instruction.accounts[1].pubkey);
  // SOL fund account is second account
  // https://explorer.solana.com/tx/mMDwUJNpmj69JnAxxZm2Kkx1CCiwogYQtbaCmMjrJUSMTJjAnS8AtX8U67HKBCiE5oQLP5Cpq8omCbxxy7ZxCp4?cluster=devnet
  if current_instruction.program_id == SNOWFLAKE_PROGRAM_PUBKEY && current_instruction.accounts[1].pubkey == SNOWFLAKE_ADMIN_FUND_PUBKEY { return Ok(()) };

  return Err(ErrorCode::AuthenticationFailed.into());
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitializeTokenAccount<'info> {
  #[account(mut)]
  pub fund: Signer<'info>,

  /// CHECK: safe
  #[account(seeds = [b"authority"], bump)]
  pub authority: UncheckedAccount<'info>,
  pub mint: Account<'info, Mint>,
  #[account(init, payer = fund, associated_token::mint = mint, associated_token::authority = authority)]
  pub token_account: Account<'info, TokenAccount>,

  pub system_program: Program<'info, System>,
  pub token_program: Program<'info, Token>,
  pub associated_token_program: Program<'info, AssociatedToken>,
  pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct PushBackSwap<'info> {
  /// CHECK: safe
  #[account(address = ADMIN_PUBKEY)]
  pub authenticator: UncheckedAccount<'info>,

  /// CHECK: safe
  #[account(seeds = [b"authority"], bump)]
  pub authority: UncheckedAccount<'info>,

  #[account(mut)]
  pub whirlpool: Box<Account<'info, Whirlpool>>,
  #[account(mut)]
  pub token_owner_account_a: Box<Account<'info, TokenAccount>>,
  #[account(mut)]
  pub token_vault_a: Box<Account<'info, TokenAccount>>,
  #[account(mut)]
  pub token_owner_account_b: Box<Account<'info, TokenAccount>>,
  #[account(mut)]
  pub token_vault_b: Box<Account<'info, TokenAccount>>,

  #[account(mut)]
  pub tick_array_0: AccountLoader<'info, TickArray>,
  #[account(mut)]
  pub tick_array_1: AccountLoader<'info, TickArray>,
  #[account(mut)]
  pub tick_array_2: AccountLoader<'info, TickArray>,
  #[account(mut)]
  pub tick_array_3: AccountLoader<'info, TickArray>,
  #[account(mut)]
  pub tick_array_4: AccountLoader<'info, TickArray>,
  #[account(mut)]
  pub tick_array_5: AccountLoader<'info, TickArray>,
  #[account(mut)]
  pub tick_array_6: AccountLoader<'info, TickArray>,

  /// CHECK: safe
  pub oracle: UncheckedAccount<'info>,

  pub whirlpool_program: Program<'info, whirlpool::program::Whirlpool>,
  pub token_program: Program<'info, Token>,

  // https://github.com/solana-labs/solana/issues/22911
  /// CHECK: safe
  #[account(address = instructions::ID)]
  pub instructions: UncheckedAccount<'info>,
}

#[error]
pub enum ErrorCode {
  #[msg("Authentication failed")]
  AuthenticationFailed, // 0x1770
  #[msg("Current tickarray not found")]
  CurrentTickArrayNotFound, // 0x1771
}
