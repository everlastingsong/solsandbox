use anchor_lang::prelude::*;
use anchor_spl::{
  token::{Token},
  associated_token::AssociatedToken,
};
use whirlpool::{
  program::Whirlpool,
  state::OpenPositionBumps,
  cpi::accounts::OpenPosition,
  self,
};

declare_id!("E9YsFZWX5ezohwgYjF31ATrKVVRzr594jDBiM4o84273");

//
// DIRECTORY STRUCTURE
//
// cpi_whirlpool_open_position
//   + programs
//     + cpi_whirlpool_open_position
//       + src
//         + lib.rs
// whirlpools (git clone)
//   + programs
//     + whirlpool
//

//
// EXECUTION
//
// https://solscan.io/tx/3qh9kx7SBFAKCdYqp6phCm3oxaUXB3HHGrmtHRS2Z7KaCi5FXKwsqdZTBP3MmcCwLsvxruGSXVjHGKUMYgB3nZXS?cluster=devnet
//

#[program]
pub mod cpi_whirlpool_open_position {
  use super::*;

  pub fn open_position(ctx: Context<OpenPositionProxy>, position_bump: u8, tick_lower_index: i32, tick_upper_index: i32) -> ProgramResult {
    // CPI for whirlpool::cpi::open_position
    // reference: https://project-serum.github.io/anchor/tutorials/tutorial-3.html#defining-a-puppet-master-program
    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();
    let cpi_accounts = OpenPosition {
      funder: ctx.accounts.funder.to_account_info(),
      owner: ctx.accounts.owner.to_account_info(),
      position: ctx.accounts.position.to_account_info(),
      position_mint: ctx.accounts.position_mint.to_account_info(),
      position_token_account: ctx.accounts.position_token_account.to_account_info(),
      whirlpool: ctx.accounts.whirlpool.to_account_info(),
      token_program: ctx.accounts.token_program.to_account_info(),
      system_program: ctx.accounts.system_program.to_account_info(),
      rent: ctx.accounts.rent.to_account_info(),
      associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    whirlpool::cpi::open_position(cpi_ctx, OpenPositionBumps { position_bump }, tick_lower_index, tick_upper_index)?;
    Ok(())
  }

}

#[derive(Accounts)]
pub struct OpenPositionProxy<'info> {
  pub whirlpool_program: Program<'info, Whirlpool>,

  #[account(mut)]
  pub funder: Signer<'info>,
  /// CHECK: Safe
  #[account(mut)]
  pub owner: AccountInfo<'info>,
  /// CHECK: Safe
  #[account(mut)]
  pub position: AccountInfo<'info>,
  #[account(mut)]
  pub position_mint: Signer<'info>,
  /// CHECK: Safe
  #[account(mut)]
  pub position_token_account: AccountInfo<'info>,
  /// CHECK: Safe
  #[account(mut)]
  pub whirlpool: AccountInfo<'info>,

  pub token_program: Program<'info, Token>,
  pub system_program: Program<'info, System>,
  pub rent: Sysvar<'info, Rent>,
  pub associated_token_program: Program<'info, AssociatedToken>,
}
