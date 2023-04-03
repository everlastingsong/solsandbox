use anchor_client::solana_sdk::commitment_config::CommitmentConfig;
use anchor_client::solana_sdk::pubkey::Pubkey;
use anchor_client::solana_sdk::signature::read_keypair_file;
use anchor_client::solana_sdk::signature::Signer;
use anchor_client::{Client as AnchorClient, Cluster};
use anchor_lang::prelude::*;
use anyhow::Result;
use solana_client::rpc_client::RpcClient;
use solana_client_helpers::Client as SolanaClient;
use solana_sdk::pubkey;
use spl_associated_token_account::get_associated_token_address;
use spl_token::ID as TOKEN_PROGRAM_ID;
use std::cell::RefCell;
use std::rc::Rc;

// use Whirlpool as crate
use whirlpool::{
    manager::swap_manager::swap,
    state::{TickArray, Whirlpool},
    util::swap_tick_sequence::SwapTickSequence,
};

use with_anchor_client::whirlpool_essential::{pda_util, swap_util};

const ORCA_WHIRLPOOL_PROGRAM_ID: Pubkey = pubkey!("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc");

// SAMO/USDC(64) whirlpool
// >>> to run this example, you need to have some SAMO and USDC in your wallet <<<
const SAMO_USDC_WHIRLPOOL_ADDRESS: Pubkey = pubkey!("9vqYJjDUFecLL2xPUC4Rc7hyCtZ6iJ4mDiVZX7aFXoAe");

// Reference: https://github.com/coral-xyz/anchor/blob/master/client/example/src/main.rs
fn main() -> Result<()> {
    //////////////////////////////////////////////////////////////////////////////////
    // setup
    //////////////////////////////////////////////////////////////////////////////////

    let rpc_endpoint_url = "https://api.mainnet-beta.solana.com";
    let rpc_ws_endpoint_url = "wss://api.mainnet-beta.solana.com";

    // load wallet
    let payer = read_keypair_file(&*shellexpand::tilde("~/.config/solana/id.json"))
        .expect("Example requires a keypair file");

    let payer_pubkey = payer.pubkey().clone();

    // build Solana client
    let connection = RpcClient::new_with_commitment(rpc_endpoint_url.to_string(), CommitmentConfig::confirmed());
    let solana_client = SolanaClient {client: connection, payer: payer.insecure_clone()};

    // build Anchor client
    let cluster = Cluster::Custom(rpc_endpoint_url.to_string(), rpc_ws_endpoint_url.to_string());
    let anchor_client = AnchorClient::new_with_options(cluster, Rc::new(payer.insecure_clone()), CommitmentConfig::confirmed());
    let program = anchor_client.program(ORCA_WHIRLPOOL_PROGRAM_ID);

    //////////////////////////////////////////////////////////////////////////////////
    // swap specific
    //////////////////////////////////////////////////////////////////////////////////

    // swap input
    let a_to_b = true;
    let amount_in = 1_000_000_000u64; // 1 SAMO

    // get whirlpool
    let mut whirlpool_data: &[u8] = &solana_client
        .get_account_data(&SAMO_USDC_WHIRLPOOL_ADDRESS)
        .unwrap();
    let whirlpool = Whirlpool::try_deserialize(&mut whirlpool_data).unwrap();

    println!("whirlpool token_mint_a {}", whirlpool.token_mint_a.to_string());
    println!("whirlpool token_mint_b {}", whirlpool.token_mint_b.to_string());
    println!("whirlpool token_vault_a {}", whirlpool.token_vault_a.to_string());
    println!("whirlpool token_vault_b {}", whirlpool.token_vault_b.to_string());
    println!("whirlpool tick_spacing {}", whirlpool.tick_spacing);
    println!("whirlpool tick_current_index {}", whirlpool.tick_current_index);
    println!("whirlpool sqrt_price {}", whirlpool.sqrt_price);

    // get tickarray for swap
    let tick_arrays = swap_util::get_tick_array_pubkeys(
        whirlpool.tick_current_index,
        whirlpool.tick_spacing,
        a_to_b,
        &ORCA_WHIRLPOOL_PROGRAM_ID,
        &SAMO_USDC_WHIRLPOOL_ADDRESS,
    );
    let mut ta0_data: &[u8] = &solana_client.get_account_data(&tick_arrays[0]).unwrap();
    let mut ta1_data: &[u8] = &solana_client.get_account_data(&tick_arrays[1]).unwrap();
    let mut ta2_data: &[u8] = &solana_client.get_account_data(&tick_arrays[2]).unwrap();
    let ta0 = TickArray::try_deserialize(&mut ta0_data).unwrap();
    let ta1 = TickArray::try_deserialize(&mut ta1_data).unwrap();
    let ta2 = TickArray::try_deserialize(&mut ta2_data).unwrap();

    println!("tick_arrays[0] {}", tick_arrays[0].to_string());
    println!("tick_arrays[1] {}", tick_arrays[1].to_string());
    println!("tick_arrays[2] {}", tick_arrays[2].to_string());

    // get quote
    let [quote_amount_in, quote_amount_out] = get_swap_quote(
        &whirlpool,
        [ta0, ta1, ta2],
        amount_in,
        true, // amount is input amount
        a_to_b,
    );
    let amount_out = calc_slippage(quote_amount_out, 1, 100); // 1%
    println!("quote amount_in {}", quote_amount_in);
    println!("quote amount_out {}", quote_amount_out);
    println!("amount_out (slippage included) {}", amount_out);

    // get oracle
    let oracle = pda_util::get_oracle(&ORCA_WHIRLPOOL_PROGRAM_ID, &SAMO_USDC_WHIRLPOOL_ADDRESS).pubkey;
    println!("oracle {}", oracle.to_string());

    // get ATA
    // - Assume that the ATA has already been created
    // - If one token of pair is SOL, the WSOL account must be processed (avoid SOL in this example)
    let ata_a = get_associated_token_address(&payer_pubkey, &whirlpool.token_mint_a);
    let ata_b = get_associated_token_address(&payer_pubkey, &whirlpool.token_mint_b);
    println!("ata_a {}", ata_a.to_string());
    println!("ata_b {}", ata_b.to_string());

    // execute proxy_swap
    let signature = program
        .request()
        .accounts(whirlpool::accounts::Swap {
            whirlpool: SAMO_USDC_WHIRLPOOL_ADDRESS,
            token_program: TOKEN_PROGRAM_ID,
            token_authority: payer_pubkey,
            token_owner_account_a: ata_a,
            token_owner_account_b: ata_b,
            token_vault_a: whirlpool.token_vault_a,
            token_vault_b: whirlpool.token_vault_b,
            tick_array_0: tick_arrays[0],
            tick_array_1: tick_arrays[1],
            tick_array_2: tick_arrays[2],
            oracle,
        })
        .args(whirlpool::instruction::Swap {
            a_to_b,
            amount_specified_is_input: true,
            other_amount_threshold: amount_out,
            sqrt_price_limit: swap_util::get_default_sqrt_price_limit(a_to_b),
            amount: amount_in,
        })
        .send()?;

    println!("signagure {}", signature.to_string());

    Ok(())
}

fn get_swap_quote(
    whirlpool: &Whirlpool,
    tick_arrays: [TickArray; 3],
    amount: u64,
    amount_specified_is_input: bool,
    a_to_b: bool,
) -> [u64; 2] {
    let ta0_refcell = RefCell::new(tick_arrays[0]);
    let ta1_refcell = RefCell::new(tick_arrays[1]);
    let ta2_refcell = RefCell::new(tick_arrays[2]);
    let mut swap_tick_sequence = SwapTickSequence::new(
        ta0_refcell.borrow_mut(),
        Some(ta1_refcell.borrow_mut()),
        Some(ta2_refcell.borrow_mut()),
    );

    // dummy
    let timestamp = whirlpool.reward_last_updated_timestamp;
    let sqrt_price_limit = swap_util::get_default_sqrt_price_limit(a_to_b);

    let swap_update = swap(
        whirlpool,
        &mut swap_tick_sequence,
        amount,
        sqrt_price_limit,
        amount_specified_is_input,
        a_to_b,
        timestamp,
    )
    .unwrap();

    [swap_update.amount_a, swap_update.amount_b]
}

fn calc_slippage(amount: u64, slippage_num: u64, slippage_denom: u64) -> u64 {
    let num = (slippage_denom - slippage_num) as u128;
    let denom = slippage_denom as u128;
    u64::try_from((amount as u128) * num / denom).unwrap()
}

/*

$ ./target/debug/swap 
whirlpool token_mint_a 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
whirlpool token_mint_b EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
whirlpool token_vault_a 3xxgYc3jXPdjqpMdrRyKtcddh4ZdtqpaN33fwaWJ2Wbh
whirlpool token_vault_b 8xKCx3SGwWR6BUr9mZFm3xwZmCVMuLjXn9iLEU6784FS
whirlpool tick_spacing 64
whirlpool tick_current_index -125594
whirlpool sqrt_price 34579649118867510
tick_arrays[0] ArnRmfQ49b2otrns9Kjug8fZXS8UdmKtxR2arpaevtxq
tick_arrays[1] ETZSYsQEAec3hmQptJaZWjdRPGqyiXrkk3FDnnPi889U
tick_arrays[2] CqeiiNNf4q2jnZAWfk6nwuvrxraMCHVTrKSMQ8bVqKkj
quote amount_in 1000000000
quote amount_out 3503
amount_out (slippage included) 3467
oracle 5HyJnjQ4XTSVXUS2Q8Ef6VCVwnXGnHE2WTwq7iSaZJez
ata_a 6dM4iMgSei6zF9y3sqdgSJ2xwNXML5wk5QKhV4DqJPhu
ata_b FbQdXCQgGQYj3xcGeryVVFjKCTsAuu53vmCRtmjQEqM5
signagure 3YX2uUgqX8Tk3UiAxRpiCpW35Vi6VRze19dvasBnodZy5Zk9CbCy2m2Dr3365we7THh1og8jh8pWiV8USkDt8FzX

*/
