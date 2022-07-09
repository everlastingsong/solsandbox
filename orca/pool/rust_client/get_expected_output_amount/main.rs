use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    account::Account,
    pubkey::Pubkey,
    transaction::Transaction,
    instruction::Instruction,
    commitment_config::CommitmentConfig,
    signature::{read_keypair_file, Keypair, Signer},
};
use solana_client_helpers::{Client, ClientResult, SplToken};
use std::str::FromStr;

const ORCA_SWAP_FEE: (u128, u128) = (30, 10000);

fn div_ceiling(numerator: u128, denominator: u128) -> u128 {
    if numerator % denominator == 0 { numerator / denominator } else { numerator / denominator + 1 }
}

fn get_expected_output_amount(
    input_pool_balance: u64,
    output_pool_balance: u64,
    input_amount: u64,
) -> u64 {
    let ib: u128 = From::from(input_pool_balance);
    let ob: u128 = From::from(output_pool_balance);
    let ia: u128 = From::from(input_amount);

    let orca_fee = ORCA_SWAP_FEE;

    let of = div_ceiling(ia * orca_fee.0, orca_fee.1);
    let mia = ia - of;

    let invariant = ib * ob;
    let next_ib = ib + mia;
    let next_ob = div_ceiling(invariant, next_ib);

    let expected_oa = ob - next_ob;

    let expected_oa_u64: u64 = TryFrom::try_from(expected_oa).unwrap();
    expected_oa_u64
}

// reference: https://www.wizzairprices.com/blog/crypto/blockchain/solana/explore-solana-blockchain-with-rust-part-1.html
fn main() {
    // connection
    let url = "https://ssc-dao.genesysgo.net/";
    let connection = RpcClient::new_with_commitment(url.to_string(), CommitmentConfig::confirmed());

    // Load your wallet account from filesystem (from default location)
    // let wallet = read_keypair_file(&*shellexpand::tilde("~/.config/solana/id.json")).expect("Example requires a keypair file");

    // temporary
    let wallet = Keypair::new();

    // helper client
    let client = Client { client: connection, payer: wallet };

    // SOL/USDC pool def: https://github.com/orca-so/typescript-sdk/blob/main/src/constants/pools.ts#L10
    let SOL_USDC_POOL_ADDRESS = Pubkey::from_str("EGZ7tiLeH62TPV1gL8WwbXGzEPa9zmcpVnnkPKKnrE2U").unwrap();
    let SOL_USDC_TOKEN_A_DEPOSIT = Pubkey::from_str("ANP74VNsHwSrq9uUSjiSNyNWvf6ZPrKTmE4gHoNd13Lg").unwrap();
    let SOL_USDC_TOKEN_B_DEPOSIT = Pubkey::from_str("75HgnSvXbWKZBpZHveX68ZzAhDqMzNDS29X6BGLtxMo1").unwrap();

    let token_a_balance = client.get_token_account_balance(&SOL_USDC_TOKEN_A_DEPOSIT).unwrap();
    let token_b_balance = client.get_token_account_balance(&SOL_USDC_TOKEN_B_DEPOSIT).unwrap();

    // check: https://api.orca.so/allPools
    println!("token_a_balance: {} ({} internally)", token_a_balance.ui_amount_string, token_a_balance.amount);
    println!("token_b_balance: {} ({} internally)", token_b_balance.ui_amount_string, token_b_balance.amount);

    // swap calc
    let pool_sol_balance = token_a_balance.amount.parse::<u64>().unwrap();
    let pool_usdc_balance = token_b_balance.amount.parse::<u64>().unwrap();
    let input_usdc_amount = 2000_000_000u64; // 2000 USDC = 2000,000,000 microUSDC internally
    let output_sol_amount = get_expected_output_amount(pool_usdc_balance, pool_sol_balance, input_usdc_amount);
    println!("swap {} microUSDC to {} lamports", input_usdc_amount, output_sol_amount);
}
