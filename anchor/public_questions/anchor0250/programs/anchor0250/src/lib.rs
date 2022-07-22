use anchor_lang::prelude::*;

// orca's whirlpool program built on Anchor 0.20.1
// cpi feature is enabled
//
// Cargo.toml dependency definition:
// whirlpool = { git = "https://github.com/orca-so/whirlpools", tag = "0.4.0", package = "whirlpool", features = ["cpi"] }
use whirlpool::{
  self,
  state::WhirlpoolsConfig,
  cpi::accounts::InitializeConfig,
};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod anchor0250 {
  use super::*;

  pub fn proxy_initialize_config(
    ctx: Context<ProxyInitializeConfig>,
    fee_authority: Pubkey,
    collect_protocol_fees_authority: Pubkey,
    reward_emissions_super_authority: Pubkey,
    default_protocol_fee_rate: u16,
  ) -> Result<()> {
    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();
    let cpi_accounts = InitializeConfig {
      config: ctx.accounts.config.to_account_info(),
      funder: ctx.accounts.funder.to_account_info(),
      system_program: ctx.accounts.system_program.to_account_info(),
    };

    /* COMPILE ERROR MESSAGE(3) for CpiContext:
    the trait bound `whirlpool::cpi::accounts::InitializeConfig<'_>: anchor_lang::ToAccountMetas` is not satisfied
      perhaps two different versions of crate `anchor_lang` are being used?rustcE0277
      initialize_config.rs(5, 10): trait impl with same name found
      context.rs(167, 8): required by a bound in `anchor_lang::context::CpiContext`
    the trait bound `whirlpool::cpi::accounts::InitializeConfig<'_>: anchor_lang::ToAccountInfos<'_>` is not satisfied
      perhaps two different versions of crate `anchor_lang` are being used?rustcE0277
      initialize_config.rs(5, 10): trait impl with same name found
      context.rs(167, 25): required by a bound in `anchor_lang::context::CpiContext`
    */
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    whirlpool::cpi::initialize_config(
      cpi_ctx,
      fee_authority,
      collect_protocol_fees_authority,
      reward_emissions_super_authority,
      default_protocol_fee_rate
    )?;
    
    Ok(())
  }
}

#[derive(Accounts)]
pub struct ProxyInitializeConfig<'info> {
  /* COMPILE ERROR MESSAGE(1) for Program:

  the trait bound `whirlpool::program::Whirlpool: Id` is not satisfied
    the trait `Id` is not implemented for `whirlpool::program::Whirlpool`rustcE0277
    program.rs(78, 30): required by a bound in `anchor_lang::prelude::Program`
  */
  pub whirlpool_program: Program<'info, whirlpool::program::Whirlpool>,
  // This definition is available, but cannot check account type by anchor
  //pub whirlpool_program: AccountInfo<'info>,

  /* COMPILE ERROR MESSAGE(2) for accounts:

  the trait bound `WhirlpoolsConfig: anchor_lang::AccountSerialize` is not satisfied
    perhaps two different versions of crate `anchor_lang` are being used?rustcE0277
    config.rs(5, 1): trait impl with same name found
    account.rs(226, 30): required by a bound in `anchor_lang::prelude::Account`
  the trait bound `WhirlpoolsConfig: anchor_lang::AccountDeserialize` is not satisfied
    perhaps two different versions of crate `anchor_lang` are being used?rustcE0277
    config.rs(5, 1): trait impl with same name found
    account.rs(226, 49): required by a bound in `anchor_lang::prelude::Account`
  the trait bound `WhirlpoolsConfig: Owner` is not satisfied
  the trait `Owner` is not implemented for `WhirlpoolsConfig`rustcE0277
    account.rs(226, 70): required by a bound in `anchor_lang::prelude::Account`
  */
  #[account(mut)]
  pub config: Account<'info, WhirlpoolsConfig>,
  // This definition is available, but cannot check account type by anchor
  //pub config: AccountInfo<'info>,

  #[account(mut)]
  pub funder: Signer<'info>,

  pub system_program: Program<'info, System>,
}
