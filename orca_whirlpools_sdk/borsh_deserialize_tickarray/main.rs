use borsh::{BorshDeserialize};
use solana_program::{ pubkey::Pubkey };

// Cargo.toml
//
// only [T; 0, 1, ...32, 64, 128, 256, 512, 1024, 2048] is implemented.
// to activate implementation for [T; N], enable const-generics feature
// https://docs.rs/borsh/0.9.1/src/borsh/de/mod.rs.html#527
//
// [dependencies]
// borsh = { version = "0.9.1", features = ["const-generics"]}
// borsh-derive = "0.9.1"
//

// reference: https://stackoverflow.com/questions/69282179/how-can-i-implement-borshdeserialize-on-struct-with-a-string
// reference: https://stackoverflow.com/questions/70149134/deserialize-array-with-borsh-in-rust

pub const NUM_REWARDS: usize = 3;
pub const TICK_ARRAY_SIZE_USIZE: usize = 88;

#[derive(Default, Copy, Clone, BorshDeserialize)]
pub struct Tick {
    // Total 137 bytes
    pub initialized: bool,     // 1
    pub liquidity_net: i128,   // 16
    pub liquidity_gross: u128, // 16

    // Q64.64
    pub fee_growth_outside_a: u128, // 16
    // Q64.64
    pub fee_growth_outside_b: u128, // 16

    // Array of Q64.64
    pub reward_growths_outside: [u128; NUM_REWARDS], // 48 = 16 * 3
}

#[derive(BorshDeserialize)]
pub struct TickArray {
    pub start_tick_index: i32,
    pub ticks: [Tick; TICK_ARRAY_SIZE_USIZE],
    pub whirlpool: Pubkey,
}

fn main() {
    println!("Hello, world!");
}
