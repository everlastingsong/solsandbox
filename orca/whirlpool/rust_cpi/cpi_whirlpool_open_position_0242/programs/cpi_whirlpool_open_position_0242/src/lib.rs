use anchor_lang::prelude::*;
use anchor_spl::{
  token::{Token},
  associated_token::AssociatedToken,
};
use whirlpool::{
  state::OpenPositionBumps,
  cpi::accounts::OpenPosition,
  self,
};

// CpiContext of v0.20.1 for whirlpool
// https://stackoverflow.com/questions/58739075/how-do-i-import-multiple-versions-of-the-same-crate
use anchor_lang_for_whirlpool::context::CpiContext as CpiContextForWhirlpool;

declare_id!("5HoNqPSwHYjs2YyUfMfd6Z95HXT55yT8Uq5BaF8fVhqq");

// fix: the trait `Id` is not implemented for `whirlpool::program::Whirlpool`
// Anchor Discord: https://discord.com/channels/889577356681945098/889702325231427584/943001650950471680
#[derive(Clone)]
pub struct WhirlpoolProgram;
impl anchor_lang::Id for WhirlpoolProgram {
  fn id() -> Pubkey { whirlpool::id() }
}

#[program]
pub mod cpi_whirlpool_open_position_0242 {
  use super::*;

  pub fn open_position(ctx: Context<OpenPositionProxy>, position_bump: u8, tick_lower_index: i32, tick_upper_index: i32) -> Result<()> {
    // CPI for whirlpool::cpi::open_position
    // reference: https://book.anchor-lang.com/anchor_in_depth/CPIs.html
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
    let cpi_ctx = CpiContextForWhirlpool::new(cpi_program, cpi_accounts);

    whirlpool::cpi::open_position(cpi_ctx, OpenPositionBumps { position_bump }, tick_lower_index, tick_upper_index)?;
    Ok(())
  }
}

#[derive(Accounts)]
pub struct OpenPositionProxy<'info> {
  pub whirlpool_program: Program<'info, WhirlpoolProgram>,

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
