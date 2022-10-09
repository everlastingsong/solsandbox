use anchor_lang::prelude::*;
use anchor_spl::{token::{self, Token, Mint, TokenAccount}, associated_token::{AssociatedToken}};
use whirlpools::{self, state::*};

#[derive(Accounts)]
#[instruction(reward_index: u8)]
pub struct ProxyCollectReward<'info> {
  pub whirlpool_program: Program<'info, whirlpools::program::Whirlpool>,

  pub whirlpool: Box<Account<'info, Whirlpool>>,

  pub position_authority: Signer<'info>,

  #[account(mut, has_one = whirlpool)]
  pub position: Box<Account<'info, Position>>,
  #[account(
      constraint = position_token_account.mint == position.position_mint,
      constraint = position_token_account.amount == 1
  )]
  pub position_token_account: Box<Account<'info, TokenAccount>>,

  #[account(mut,
      constraint = reward_owner_account.mint == whirlpool.reward_infos[reward_index as usize].mint
  )]
  pub reward_owner_account: Box<Account<'info, TokenAccount>>,

  #[account(mut, address = whirlpool.reward_infos[reward_index as usize].vault)]
  pub reward_vault: Box<Account<'info, TokenAccount>>,

  #[account(address = token::ID)]
  pub token_program: Program<'info, Token>,
}

pub fn handler(
  ctx: Context<ProxyCollectReward>,
  reward_index: u8,
) -> Result<()> {
  let cpi_program = ctx.accounts.whirlpool_program.to_account_info();

  let cpi_accounts = whirlpools::cpi::accounts::CollectReward {
    whirlpool: ctx.accounts.whirlpool.to_account_info(),
    position_authority: ctx.accounts.position_authority.to_account_info(),
    position: ctx.accounts.position.to_account_info(),
    position_token_account: ctx.accounts.position_token_account.to_account_info(),
    reward_owner_account: ctx.accounts.reward_owner_account.to_account_info(),
    reward_vault: ctx.accounts.reward_vault.to_account_info(),
    token_program: ctx.accounts.token_program.to_account_info(),
  };

  let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

  // execute CPI
  msg!("CPI: whirlpool collect_reward instruction");
  whirlpools::cpi::collect_reward(cpi_ctx, reward_index)?;

  Ok(())
}