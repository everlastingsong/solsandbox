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

    // MNGO/USDC pool def: https://github.com/orca-so/typescript-sdk/blob/main/src/constants/pools.ts#L1163
    let MNGO_USDC_POOL_ADDRESS = Pubkey::from_str("Hk9ZCvmqVT1FHNkWJMrtMkkVnH1WqssWPAvmio5Vs3se").unwrap();
    let MNGO_USDC_TOKEN_A_DEPOSIT = Pubkey::from_str("J8bQnhcNyixFGBskQoJ2aSPXPWjvSzaaxF4YPs96XHDJ").unwrap();
    let MNGO_USDC_TOKEN_B_DEPOSIT = Pubkey::from_str("5yMoAhjfFaCPwEwKM2VeFFh2iBs5mHWLTJ4LuqZifsgN").unwrap();

    let token_a_balance = client.get_token_account_balance(&MNGO_USDC_TOKEN_A_DEPOSIT).unwrap();
    let token_b_balance = client.get_token_account_balance(&MNGO_USDC_TOKEN_B_DEPOSIT).unwrap();

    // check: https://api.orca.so/allPools
    println!("token_a_balance: {}", token_a_balance.ui_amount_string);
    println!("token_b_balance: {}", token_b_balance.ui_amount_string);
}
