use anchor_client::solana_sdk::pubkey::Pubkey;
use solana_sdk::pubkey;

const METAPLEX_METADATA_PROGRAM_ID: Pubkey = pubkey!("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

pub struct PDA {
    pub pubkey: Pubkey,
    pub bump: u8,
}

pub fn get_whirlpool(
    program_id: &Pubkey,
    whirlpools_config_pubkey: &Pubkey,
    mint_a: &Pubkey,
    mint_b: &Pubkey,
    tick_spacing: u16,
) -> PDA {
    let tick_spacing_bytes = tick_spacing.to_le_bytes();
    let seeds = [
        b"whirlpool",
        whirlpools_config_pubkey.as_ref(),
        mint_a.as_ref(),
        mint_b.as_ref(),
        tick_spacing_bytes.as_ref(),
    ];
    let (pubkey, bump) = Pubkey::find_program_address(&seeds, program_id);
    PDA { pubkey, bump }
}

pub fn get_position(
    program_id: &Pubkey,
    position_mint: &Pubkey,
) -> PDA {
    let seeds = [
        b"position",
        position_mint.as_ref(),
    ];
    let (pubkey, bump) = Pubkey::find_program_address(&seeds, program_id);
    PDA { pubkey, bump }
}

pub fn get_position_metadata(
    position_mint: &Pubkey,
) -> PDA {
    let seeds = [
        b"metadata",
        METAPLEX_METADATA_PROGRAM_ID.as_ref(),
        position_mint.as_ref(),
    ];
    let (pubkey, bump) = Pubkey::find_program_address(&seeds, &METAPLEX_METADATA_PROGRAM_ID);
    PDA { pubkey, bump }
}

pub fn get_tick_array(
    program_id: &Pubkey,
    whirlpool_pubkey: &Pubkey,
    start_tick_index: i32,
) -> PDA {
    let start_tick_index_str = start_tick_index.to_string();
    let seeds = [
        b"tick_array",
        whirlpool_pubkey.as_ref(),
        start_tick_index_str.as_bytes(),
    ];
    let (pubkey, bump) = Pubkey::find_program_address(&seeds, program_id);
    PDA { pubkey, bump }
}
  
pub fn get_oracle(program_id: &Pubkey, whirlpool_pubkey: &Pubkey) -> PDA {
    let seeds = [b"oracle", whirlpool_pubkey.as_ref()];
    let (pubkey, bump) = Pubkey::find_program_address(&seeds, program_id);
    PDA { pubkey, bump }
}
