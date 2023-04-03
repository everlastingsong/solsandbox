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
use solana_sdk::sysvar::rent::ID as SYSVAR_RENT_ID;
use solana_sdk::signature::Keypair;
use solana_sdk::system_program::ID as SYSTEM_PROGRAM_ID;
use solana_sdk::instruction::Instruction;
use solana_sdk::transaction::Transaction;
use spl_associated_token_account::get_associated_token_address;
use spl_token::ID as TOKEN_PROGRAM_ID;
use spl_associated_token_account::ID as ASSOCIATED_TOKEN_PROGRAM_ID;
use std::rc::Rc;
use bigdecimal::BigDecimal;

// use Whirlpool as crate
use whirlpool::state::Whirlpool;

use with_anchor_client::whirlpool_essential::{pda_util, price_math, liquidity_math, tick_util};

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
    // open_position specific
    //////////////////////////////////////////////////////////////////////////////////

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

    // input
    let input_token_mint = whirlpool.token_mint_a;
    let input_token_amount = 1_000_000_000u64; // 1 SAMO
    let decimals_a = 9;
    let decimals_b = 9;
    let price = price_math::sqrt_price_x64_to_price(whirlpool.sqrt_price, decimals_a, decimals_b);
    let price_lower = price.clone() / BigDecimal::from(2);
    let price_upper = price.clone() * BigDecimal::from(2);
    let tick_lower_index = price_math::price_to_initializable_tick_index(&price_lower, decimals_a, decimals_b, whirlpool.tick_spacing);
    let tick_upper_index = price_math::price_to_initializable_tick_index(&price_upper, decimals_a, decimals_b, whirlpool.tick_spacing);
    println!("tick_lower: index {} price {}", tick_lower_index, price_lower.to_string());
    println!("tick_upper: index {} price {}", tick_upper_index, price_upper.to_string());

    // get quote
    let quote = get_increase_liquidity_quote(
        whirlpool.sqrt_price,
        whirlpool.tick_current_index,
        tick_lower_index,
        tick_upper_index,
        &whirlpool.token_mint_a,
        &whirlpool.token_mint_b,
        &input_token_mint,
        input_token_amount,
        1u64,
        100u64
    );
    println!("quote liquidity: {}", quote.liquidity);
    println!("quote token_a: est {} max {}", quote.token_est_a, quote.token_max_a);
    println!("quote token_b: est {} max {}", quote.token_est_b, quote.token_max_b);

    // open_position
    let position_mint = Keypair::new();
    let position = pda_util::get_position(&ORCA_WHIRLPOOL_PROGRAM_ID, &position_mint.pubkey());
    let position_ata = get_associated_token_address(&payer_pubkey, &position_mint.pubkey());

    let mut open_position_ix = program
        .request()
        .accounts(whirlpool::accounts::OpenPosition {
            whirlpool: SAMO_USDC_WHIRLPOOL_ADDRESS,
            funder: payer_pubkey,
            owner: payer_pubkey,
            position_mint: position_mint.pubkey(),
            position: position.pubkey,
            position_token_account: position_ata,
            rent: SYSVAR_RENT_ID,
            token_program: TOKEN_PROGRAM_ID,
            associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
            system_program: SYSTEM_PROGRAM_ID,
        })
        .args(whirlpool::instruction::OpenPosition {
            bumps: whirlpool::state::OpenPositionBumps {
                position_bump: position.bump
            },
            tick_lower_index,
            tick_upper_index,
        })
        .instructions()?;

    //////////////////////////////////////////////////////////////////////////////////
    // increase_liquidity specific
    //////////////////////////////////////////////////////////////////////////////////

    // get ATA
    // - Assume that the ATA has already been created
    // - If one token of pair is SOL, the WSOL account must be processed (avoid SOL in this example)
    let ata_a = get_associated_token_address(&payer_pubkey, &whirlpool.token_mint_a);
    let ata_b = get_associated_token_address(&payer_pubkey, &whirlpool.token_mint_b);
    println!("ata_a {}", ata_a.to_string());
    println!("ata_b {}", ata_b.to_string());

    // increase_liquidity
    let tick_array_lower_start_index = tick_util::get_start_tick_index(tick_lower_index, whirlpool.tick_spacing, 0);
    let tick_array_upper_start_index = tick_util::get_start_tick_index(tick_upper_index, whirlpool.tick_spacing, 0);
    let tick_array_lower = pda_util::get_tick_array(&ORCA_WHIRLPOOL_PROGRAM_ID, &SAMO_USDC_WHIRLPOOL_ADDRESS, tick_array_lower_start_index);
    let tick_array_upper = pda_util::get_tick_array(&ORCA_WHIRLPOOL_PROGRAM_ID, &SAMO_USDC_WHIRLPOOL_ADDRESS, tick_array_upper_start_index);
    println!("tick_array_lower {}", tick_array_lower.pubkey.to_string());
    println!("tick_array_upper {}", tick_array_upper.pubkey.to_string());

    let mut increase_liquidity_ix = program
        .request()
        .accounts(whirlpool::accounts::ModifyLiquidity {
            whirlpool: SAMO_USDC_WHIRLPOOL_ADDRESS,
            token_program: TOKEN_PROGRAM_ID,
            position_authority: payer_pubkey,
            position: position.pubkey,
            position_token_account: position_ata,
            tick_array_lower: tick_array_lower.pubkey,
            tick_array_upper: tick_array_upper.pubkey,
            token_owner_account_a: ata_a,
            token_owner_account_b: ata_b,
            token_vault_a: whirlpool.token_vault_a,
            token_vault_b: whirlpool.token_vault_b,
        })
        .args(whirlpool::instruction::IncreaseLiquidity {
            liquidity_amount: quote.liquidity,
            token_max_a: quote.token_max_a,
            token_max_b: quote.token_max_b,
        })
        .instructions()?;

    //////////////////////////////////////////////////////////////////////////////////
    // send transaction
    //////////////////////////////////////////////////////////////////////////////////
    
    let mut instructions: Vec<Instruction> = vec![];
    instructions.append(&mut open_position_ix);
    instructions.append(&mut increase_liquidity_ix);

    let signers = [&payer, &position_mint];
    
    let mut transaction = Transaction::new_with_payer(
        instructions.as_slice(),
        Some(&payer_pubkey),
    );
    let blockhash = solana_client.get_latest_blockhash()?;
    transaction.sign(&signers, blockhash);
    let signature = solana_client.send_and_confirm_transaction(&transaction)?;

    println!("signagure {}", signature.to_string());

    Ok(())
}


struct IncreaseLiquidityQuote {
    liquidity: u128,
    token_est_a: u64,
    token_est_b: u64,
    token_max_a: u64,
    token_max_b: u64,
}

fn get_increase_liquidity_quote(
    sqrt_price: u128,
    tick_current_index: i32,
    tick_lower_index: i32,
    tick_upper_index: i32,
    token_mint_a: &Pubkey,
    _token_mint_b: &Pubkey,
    input_token_mint: &Pubkey,
    input_token_amount: u64,
    slippage_num: u64,
    slippage_denom: u64,
) -> IncreaseLiquidityQuote {
    let input_token_is_a = input_token_mint.eq(token_mint_a);

    if tick_upper_index <= tick_current_index || tick_current_index < tick_lower_index {
        return IncreaseLiquidityQuote {
            liquidity: 0,
            token_est_a: 0,
            token_est_b: 0,
            token_max_a: 0,
            token_max_b: 0,
        };
    }

    let lower = price_math::tick_index_to_sqrt_price_x64(tick_lower_index);
    let upper = price_math::tick_index_to_sqrt_price_x64(tick_upper_index);
    let current = u128::min(u128::max(sqrt_price, lower), upper);

    let liquidity = if input_token_is_a {
        liquidity_math::get_liquidity_from_token_a(current, upper, input_token_amount)
    } else {
        liquidity_math::get_liquidity_from_token_b(lower, current, input_token_amount)
    };

    let estimate_amount = liquidity_math::get_token_amounts_from_liquidity(
        liquidity,
        current,
        lower,
        upper,
        true,
    );

    IncreaseLiquidityQuote {
        liquidity,
        token_est_a: estimate_amount.token_a,
        token_est_b: estimate_amount.token_b,
        token_max_a: add_slippage(estimate_amount.token_a, slippage_num, slippage_denom),
        token_max_b: add_slippage(estimate_amount.token_b, slippage_num, slippage_denom),
    }
}

fn add_slippage(amount: u64, slippage_num: u64, slippage_denom: u64) -> u64 {
    let num = (slippage_denom + slippage_num) as u128;
    let denom = slippage_denom as u128;
    u64::try_from((amount as u128) * num / denom).unwrap()
}

/*

$ ./target/debug/open_position_with_liquidity 
whirlpool token_mint_a 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
whirlpool token_mint_b EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
whirlpool token_vault_a 3xxgYc3jXPdjqpMdrRyKtcddh4ZdtqpaN33fwaWJ2Wbh
whirlpool token_vault_b 8xKCx3SGwWR6BUr9mZFm3xwZmCVMuLjXn9iLEU6784FS
whirlpool tick_spacing 64
whirlpool tick_current_index -125594
whirlpool sqrt_price 34579648713303182
tick_lower: index -132480 price 0.000001756999805713224951132688507176757749086033684656370833183034763952809765182570562319641638282519124913960695266723632813
tick_upper: index -118656 price 0.000007027999222852899804530754028707030996344134738625483332732139055811239060730282249278566553130076499655842781066894531250
quote liquidity: 6395525
quote token_a: est 999999901 max 1009999900
quote token_b: est 3493 max 3527
ata_a 6dM4iMgSei6zF9y3sqdgSJ2xwNXML5wk5QKhV4DqJPhu
ata_b FbQdXCQgGQYj3xcGeryVVFjKCTsAuu53vmCRtmjQEqM5
tick_array_lower ETZSYsQEAec3hmQptJaZWjdRPGqyiXrkk3FDnnPi889U
tick_array_upper Gad6jpBXSxFmSqcPSPTE9jABp9ragNc2VsdUCNWLEAMT
signagure 33Mnwwzakfc8YeUBwiyY49hkQDARFBaarsRWok7Xktq8aLkwSn7pdF8GLeveF5VKMRtPFRArLKv8Zt1eTy2WtwA6

*/
