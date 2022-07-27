use anchor_lang::prelude::*;
use borsh::{BorshDeserialize, BorshSerialize};

declare_id!("656fzuwuJhFNmfxjE7zFguhphKVAGYYptpkW414tywm5");

#[program]
pub mod anchor_instruction {
  use super::*;

  pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let data: Vec<u8> = OpenPositionInstructionData {
      instruction_code: 0x31f0980f4d2f8087u64,  // reverse order of 0x87802f4d0f98f031
      bump: OpenPositionBumps { position_bump: 0xFFu8 },
      tick_lower_index: 0x01020304i32,
      tick_upper_index: 0x05060708i32,
    }.try_to_vec()?;

    for d in data.iter() {
      msg!("data: {:02x}", d);
    }

    Ok(())
  }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct OpenPositionBumps {
  pub position_bump: u8,

}
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct OpenPositionInstructionData {
  pub instruction_code: u64,
  pub bump: OpenPositionBumps,
  pub tick_lower_index: i32,
  pub tick_upper_index: i32,
}