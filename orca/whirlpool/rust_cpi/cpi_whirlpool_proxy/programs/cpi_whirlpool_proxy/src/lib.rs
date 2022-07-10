use anchor_lang::prelude::*;
use anchor_spl::{
  token::{Token, TokenAccount},
  associated_token::AssociatedToken,
};
use whirlpool::{
  self,
  program::Whirlpool as WhirlpoolProgram,
  state::{Whirlpool, TickArray, Position, OpenPositionWithMetadataBumps},
  cpi::accounts::{Swap, OpenPositionWithMetadata, ModifyLiquidity},
};

declare_id!("GBzoew3zF7XXtxfHzW5xtFVboKkbHxXmBVcYRXcs1MoV");

#[program]
pub mod cpi_whirlpool_proxy {
  use super::*;

  pub fn proxy_swap(
    ctx: Context<ProxySwap>,
    amount: u64,
    other_amount_threshold: u64,
    sqrt_price_limit: u128,
    amount_specified_is_input: bool,
    a_to_b: bool, // Zero for one
  ) -> ProgramResult {
    // proxy request
    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();
    let cpi_accounts = Swap {
      whirlpool: ctx.accounts.whirlpool.to_account_info(),
      token_authority: ctx.accounts.token_authority.to_account_info(),
      token_owner_account_a: ctx.accounts.token_owner_account_a.to_account_info(),
      token_vault_a: ctx.accounts.token_vault_a.to_account_info(),
      token_owner_account_b: ctx.accounts.token_owner_account_b.to_account_info(),
      token_vault_b: ctx.accounts.token_vault_b.to_account_info(),
      tick_array_0: ctx.accounts.tick_array_0.to_account_info(),
      tick_array_1: ctx.accounts.tick_array_1.to_account_info(),
      tick_array_2: ctx.accounts.tick_array_2.to_account_info(),
      oracle: ctx.accounts.oracle.to_account_info(),
      token_program: ctx.accounts.token_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
      cpi_program,
      cpi_accounts,
    );

    // execute CPI
    whirlpool::cpi::swap(
      cpi_ctx,
      amount,
      other_amount_threshold,
      sqrt_price_limit,
      amount_specified_is_input,
      a_to_b
    )?;

    Ok(())
  }

  pub fn proxy_open_position_with_metadata(
    ctx: Context<ProxyOpenPositionWithMetadata>,
    position_bump: u8,
    metadata_bump: u8,
    tick_lower_index: i32,
    tick_upper_index: i32,
  ) -> ProgramResult {
    // proxy request
    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();
    let cpi_accounts = OpenPositionWithMetadata {
      funder: ctx.accounts.funder.to_account_info(),
      owner: ctx.accounts.owner.to_account_info(),
      position: ctx.accounts.position.to_account_info(),
      position_mint: ctx.accounts.position_mint.to_account_info(),
      position_metadata_account: ctx.accounts.position_metadata_account.to_account_info(),
      position_token_account: ctx.accounts.position_token_account.to_account_info(),
      whirlpool: ctx.accounts.whirlpool.to_account_info(),
      token_program: ctx.accounts.token_program.to_account_info(),
      system_program: ctx.accounts.system_program.to_account_info(),
      rent: ctx.accounts.rent.to_account_info(),
      associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
      metadata_program: ctx.accounts.metadata_program.to_account_info(),
      metadata_update_auth: ctx.accounts.metadata_update_auth.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    // execute CPI
    whirlpool::cpi::open_position_with_metadata(
      cpi_ctx,
      OpenPositionWithMetadataBumps { position_bump: position_bump, metadata_bump: metadata_bump },
      tick_lower_index,
      tick_upper_index
    )?;

    Ok(())
  }

  pub fn proxy_increase_liquidity(
    ctx: Context<ProxyModifyLiquidity>,
    liquidity_amount: u128,
    token_max_a: u64,
    token_max_b: u64,
  ) -> ProgramResult {
    // proxy request
    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();
    let cpi_accounts = ModifyLiquidity {
      whirlpool: ctx.accounts.whirlpool.to_account_info(),
      token_program: ctx.accounts.token_program.to_account_info(),
      position_authority: ctx.accounts.position_authority.to_account_info(),
      position: ctx.accounts.position.to_account_info(),
      position_token_account: ctx.accounts.position_token_account.to_account_info(),
      token_owner_account_a: ctx.accounts.token_owner_account_a.to_account_info(),
      token_owner_account_b: ctx.accounts.token_owner_account_b.to_account_info(),
      token_vault_a: ctx.accounts.token_vault_a.to_account_info(),
      token_vault_b: ctx.accounts.token_vault_b.to_account_info(),
      tick_array_lower: ctx.accounts.tick_array_lower.to_account_info(),
      tick_array_upper: ctx.accounts.tick_array_upper.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    // execute CPI
    whirlpool::cpi::increase_liquidity(
      cpi_ctx,
      liquidity_amount,
      token_max_a,
      token_max_b,
    )?;

    Ok(())
  }


}

#[derive(Accounts)]
pub struct ProxySwap<'info> {
  // proxy
  pub whirlpool_program: Program<'info, WhirlpoolProgram>,

  pub token_program: Program<'info, Token>,
  pub token_authority: Signer<'info>,
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
  /// CHECK: checked by whirlpool_program
  pub oracle: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ProxyOpenPositionWithMetadata<'info> {
  // proxy
  pub whirlpool_program: Program<'info, WhirlpoolProgram>,

  #[account(mut)]
  pub funder: Signer<'info>,
  /// CHECK: checked by whirlpool_program
  pub owner: UncheckedAccount<'info>,

  /// CHECK: checked by whirlpool_program
  #[account(mut)]
  pub position: UncheckedAccount<'info>,
  #[account(mut)]
  pub position_mint: Signer<'info>,
  /// CHECK: checked by whirlpool_program
  #[account(mut)]
  pub position_metadata_account: UncheckedAccount<'info>,
  /// CHECK: checked by whirlpool_program
  #[account(mut)]
  pub position_token_account: UncheckedAccount<'info>,

  pub whirlpool: Box<Account<'info, Whirlpool>>,
  pub token_program: Program<'info, Token>,
  pub system_program: Program<'info, System>,
  pub rent: Sysvar<'info, Rent>,
  pub associated_token_program: Program<'info, AssociatedToken>,

  /// CHECK: checked by whirlpool_program
  pub metadata_program: UncheckedAccount<'info>,
  /// CHECK: checked by whirlpool_program
  pub metadata_update_auth: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ProxyModifyLiquidity<'info> {
  // proxy
  pub whirlpool_program: Program<'info, WhirlpoolProgram>,

  #[account(mut)]
  pub whirlpool: Account<'info, Whirlpool>,
  pub token_program: Program<'info, Token>,

  pub position_authority: Signer<'info>,

  #[account(mut)]
  pub position: Account<'info, Position>,
  pub position_token_account: Box<Account<'info, TokenAccount>>,

  #[account(mut)]
  pub token_owner_account_a: Box<Account<'info, TokenAccount>>,
  #[account(mut)]
  pub token_owner_account_b: Box<Account<'info, TokenAccount>>,
  #[account(mut)]
  pub token_vault_a: Box<Account<'info, TokenAccount>>,
  #[account(mut)]
  pub token_vault_b: Box<Account<'info, TokenAccount>>,

  #[account(mut)]
  pub tick_array_lower: AccountLoader<'info, TickArray>,
  #[account(mut)]
  pub tick_array_upper: AccountLoader<'info, TickArray>,
}