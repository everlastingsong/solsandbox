use anchor_lang::prelude::*;
use anchor_spl::{
  token::{TokenAccount, Mint, Token}
};
use solana_program::{
  pubkey,
  instruction::{Instruction, AccountMeta},
};
use spl_token_swap::instruction::{SwapInstruction, Swap};

declare_id!("J8iyBRPnF8Px4i7TBTK57EozE8P3RFEJ9GwgCsVjfEV4");

// for DEVNET (mainnet: 9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP)
const ORCA_SWAP_PROGRAM_ID: Pubkey = pubkey!("3xQ8SWv2GaFXXpHZNqkXsdxq5DZciHBz6ZFoPPfbFd7U");

#[program]
pub mod cpi_with_spl_token_swap {
    use super::*;

    // This is an example of CPI for Orca's (noamrl/standard) pool.
    // This simply pass the request to Orca's Swap Program as proxy program.
    pub fn proxy_swap(ctx: Context<ProxySwap>, amount_in: u64, minimum_amount_out: u64) -> Result<()> {
      // construct instruction data
      let data = SwapInstruction::Swap(Swap {
        amount_in: amount_in,
        minimum_amount_out: minimum_amount_out
      });

      // construct swap instruction
      let swap_ix = Instruction {
        program_id: ctx.accounts.orca_swap_program.key(),
        accounts: vec![
          AccountMeta::new_readonly(ctx.accounts.address.key(), false),
          AccountMeta::new_readonly(ctx.accounts.authority.key(), false),
          AccountMeta::new_readonly(ctx.accounts.user_transfer_authority.key(), true),
          AccountMeta::new(ctx.accounts.user_source.key(), false),
          AccountMeta::new(ctx.accounts.pool_source.key(), false),
          AccountMeta::new(ctx.accounts.pool_destination.key(), false),
          AccountMeta::new(ctx.accounts.user_destination.key(), false),
          AccountMeta::new(ctx.accounts.pool_token_mint.key(), false),
          AccountMeta::new(ctx.accounts.fee_account.key(), false),
          AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
        ],
        data: data.pack(),
      };

      // execute CPI
      solana_program::program::invoke(
        &swap_ix,
        &[
          ctx.accounts.orca_swap_program.to_account_info(),
          ctx.accounts.address.to_account_info(),
          ctx.accounts.authority.to_account_info(),
          ctx.accounts.user_transfer_authority.to_account_info(),
          ctx.accounts.user_source.to_account_info(),
          ctx.accounts.pool_source.to_account_info(),
          ctx.accounts.pool_destination.to_account_info(),
          ctx.accounts.user_destination.to_account_info(),
          ctx.accounts.pool_token_mint.to_account_info(),
          ctx.accounts.fee_account.to_account_info(),
          ctx.accounts.token_program.to_account_info(),
        ]
      )?;

      Ok(())
    }

  }

#[derive(Accounts)]
pub struct ProxySwap<'info> {
  /// CHECK: safe
  #[account(address=ORCA_SWAP_PROGRAM_ID)]
  pub orca_swap_program: AccountInfo<'info>,

  pub token_program: Program<'info, Token>,
  /// CHECK: safe
  pub address: UncheckedAccount<'info>,
  /// CHECK: safe
  pub authority: UncheckedAccount<'info>,
  #[account(mut)]
  pub user_transfer_authority: Signer<'info>,
  #[account(mut)]
  pub user_source: Box<Account<'info, TokenAccount>>,
  #[account(mut)]
  pub pool_source: Box<Account<'info, TokenAccount>>,
  #[account(mut)]
  pub pool_destination: Box<Account<'info, TokenAccount>>,
  #[account(mut)]
  pub user_destination: Box<Account<'info, TokenAccount>>,
  #[account(mut)]
  pub pool_token_mint: Box<Account<'info, Mint>>,
  #[account(mut)]
  pub fee_account: Box<Account<'info, TokenAccount>>,
}
