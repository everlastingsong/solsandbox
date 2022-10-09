use anchor_lang::prelude::*;
use anchor_spl::{token::{self, Token, Mint, TokenAccount}, associated_token::{AssociatedToken}};
use whirlpools::{self, state::*};

#[derive(Accounts)]
pub struct ProxyUpdateFeesAndRewards<'info> {
  pub whirlpool_program: Program<'info, whirlpools::program::Whirlpool>,

  #[account(mut)]
  pub whirlpool: Account<'info, Whirlpool>,

  #[account(mut, has_one = whirlpool)]
  pub position: Account<'info, Position>,

  #[account(has_one = whirlpool)]
  pub tick_array_lower: AccountLoader<'info, TickArray>,
  #[account(has_one = whirlpool)]
  pub tick_array_upper: AccountLoader<'info, TickArray>,
}

pub fn handler(
  ctx: Context<ProxyUpdateFeesAndRewards>,
) -> ProgramResult {
  let cpi_program = ctx.accounts.whirlpool_program.to_account_info();

  let cpi_accounts = whirlpools::cpi::accounts::UpdateFeesAndRewards {
    whirlpool: ctx.accounts.whirlpool.to_account_info(),
    position: ctx.accounts.position.to_account_info(),
    tick_array_lower: ctx.accounts.tick_array_lower.to_account_info(),
    tick_array_upper: ctx.accounts.tick_array_upper.to_account_info(),
  };

  let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

  // execute CPI
  msg!("CPI: whirlpool update_fees_and_rewards instruction");
  whirlpools::cpi::update_fees_and_rewards(cpi_ctx)?;

  Ok(())
}