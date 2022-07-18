use anchor_lang::prelude::*;
use solana_program::pubkey; // cannot import pubkey! macro from anchor_lang...

declare_id!("8AFYzgM2eostiQwAgUM6BZwqED53UDDZTYikDhL8sZh4");

// PDA seeds
const USER_INFO_PDA_SEED_PREFIX: &[u8; 4] = b"info";
const FARM_OWNER_PDA_SEED_PREFIX: &[u8; 9] = b"farmowner";

// Orca related constants
const ORCA_AQUAFARM_PROGRAM_ID: Pubkey = pubkey!("82yxjeMsvaURa4MbZZ7WZZHfobirZYkH1zF8fmeGtyaQ");
const ORCA_USER_FARM_STATE_RENT_LAMPORTS: u64 = 1628640;

#[program]
pub mod orca_farm_controller {
  use super::*;

  pub fn create_user_info(ctx: Context<CreateUserInfo>, farm_owner_pda_bump: u8) -> Result<()> {
    ctx.accounts.user_info_pda.farm_owner_pda_bump = farm_owner_pda_bump;
    Ok(())
  }

  pub fn init_user_farm(ctx: Context<InitUserFarm>) -> Result<()> {
    // transfer SOL from funder to farm_owner_pda
    let soltransfer_funder_farm_owner_pda_ix = anchor_lang::solana_program::system_instruction::transfer(
      &ctx.accounts.funder.key(),
      &ctx.accounts.farm_owner_pda.key(),
      ORCA_USER_FARM_STATE_RENT_LAMPORTS,
    );
    anchor_lang::solana_program::program::invoke(
      &soltransfer_funder_farm_owner_pda_ix,
      &[
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.funder.to_account_info(),
        ctx.accounts.farm_owner_pda.to_account_info(),
      ],
    )?;

    // CPI InitUserFarm of AquaFarmProgram
    let init_user_farm_ix = anchor_lang::solana_program::instruction::Instruction {
      program_id: ctx.accounts.orca_aquafarm_program.key(),
      accounts: vec![
        AccountMeta::new_readonly(ctx.accounts.orca_global_farm_state.key(), false),
        AccountMeta::new(ctx.accounts.orca_user_farm_state.key(), false),
        AccountMeta::new(ctx.accounts.farm_owner_pda.key(), true),
        AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
      ],
      data: [1u8 /* 1 = InitUserFarm */].try_to_vec()?,
    };
    anchor_lang::solana_program::program::invoke_signed(
      &init_user_farm_ix,
      &[
        ctx.accounts.orca_aquafarm_program.to_account_info(),
        ctx.accounts.orca_global_farm_state.to_account_info(),
        ctx.accounts.orca_user_farm_state.to_account_info(),
        ctx.accounts.farm_owner_pda.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
      ],
      &[
        // seeds for farm_owner_pda
        &[FARM_OWNER_PDA_SEED_PREFIX.as_ref(), &ctx.accounts.user.key().to_bytes(), &[ctx.accounts.user_info_pda.farm_owner_pda_bump]]
      ],
    )?;

    Ok(())
  }
}

#[derive(Accounts)]
pub struct CreateUserInfo<'info> {
  // This account provides SOL for rent
  #[account(mut)]
  pub funder: Signer<'info>,

  // This account is used to identify user(customer)
  pub user: SystemAccount<'info>,

  // This account stores some info of user
  #[account(init, payer = funder, space = UserInfo::LEN, seeds = [USER_INFO_PDA_SEED_PREFIX.as_ref(), &user.key().to_bytes()], bump)]
  pub user_info_pda: Account<'info, UserInfo>,

  // Aux accounts
  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitUserFarm<'info> {
  // This account provides SOL for rent of user_farm_state
  pub funder: Signer<'info>,

  // This account is used to identify user(customer)
  pub user: SystemAccount<'info>,

  // This account stores some info of user
  #[account(seeds = [USER_INFO_PDA_SEED_PREFIX.as_ref(), &user.key().to_bytes()], bump)]
  pub user_info_pda: Account<'info, UserInfo>,

  // This accout is used as owner of user farm
  #[account(mut, seeds = [FARM_OWNER_PDA_SEED_PREFIX.as_ref(), &user.key().to_bytes()], bump = user_info_pda.farm_owner_pda_bump)]
  pub farm_owner_pda: SystemAccount<'info>,

  // Orca required accounts
  /// CHECK: by constraints
  #[account(address = ORCA_AQUAFARM_PROGRAM_ID)]
  pub orca_aquafarm_program: UncheckedAccount<'info>,
  /// CHECK: AquaFarm Program will check
  pub orca_global_farm_state: UncheckedAccount<'info>,
  /// CHECK: AquaFarm Program will check
  #[account(mut)]
  pub orca_user_farm_state: UncheckedAccount<'info>,

  // Aux accounts
  pub system_program: Program<'info, System>,
}

#[account]
pub struct UserInfo {
  pub farm_owner_pda_bump: u8,
  pub other_info: [u8; 32], // some info if needed
}

impl UserInfo {
  // space = 8(ANCHOR) + 1 + 32 = 41
  pub const LEN: usize = 8 + 1 + 32;
}
