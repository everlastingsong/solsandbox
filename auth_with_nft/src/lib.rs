use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::AccountInfo,
    account_info::next_account_info,
    pubkey::Pubkey,
    entrypoint,
    entrypoint::ProgramResult,
    system_program,
    program_error::ProgramError,
    msg,
};
use spl_token;


#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct TokenAccount {
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct MetadataAccount {
    pub key: u8,
    pub update_authority: Pubkey,
    pub mint: Pubkey,
}


entrypoint!(process_instruction);

// 渡すアカウントの一覧
// 1) NFTを持っていると確認してもらいたいウォレットのアドレス (署名者である必要あり) ※他人のウォレットを確認しても認証にならない
// 2) 持っていると確認したいNFTのシリーズの update_authority
// 3) 保持しているNFTのトークンアカウント
// 4) 保持しているNFTのメタデータアカウント
pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    let METAPLEX_METADATA_PROGRAM_ID = Pubkey::try_from("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").unwrap();

    let accounts_iter = &mut accounts.iter();

    // 与えられるアカウントの個数チェック(不足したらErr)
    msg!("check num of accounts...");
    let owner_signer = next_account_info(accounts_iter)?;
    msg!("1) owner_signer: {}", owner_signer.key.to_string());
    let update_authority = next_account_info(accounts_iter)?;
    msg!("2) update_authority: {}", update_authority.key.to_string());
    let token = next_account_info(accounts_iter)?;
    msg!("3) token: {}", token.key.to_string());
    let metadata = next_account_info(accounts_iter)?;
    msg!("4) metadata: {}", metadata.key.to_string());
    msg!("check num of accounts OK!");

    // update_authority は実際の認証に使う場合はプログラムにハードコードすると思うので検証せずインプットを信じる

    // オーナーと主張するアカウントが署名しているかチェック
    msg!("check signature...");
    if ! owner_signer.is_signer { return Err(ProgramError::MissingRequiredSignature); }
    msg!("check signature OK!");

    // オーナープログラムのチェック
    msg!("check owner program...");
    if ! owner_signer.owner.eq(&system_program::id()) { return Err(ProgramError::InvalidAccountData); }
    msg!("owner program of owner_signer OK! ({})", system_program::id());
    if ! token.owner.eq(&spl_token::id()) { return Err(ProgramError::InvalidAccountData); }
    msg!("owner program of token OK! ({})", spl_token::id());
    if ! metadata.owner.eq(&METAPLEX_METADATA_PROGRAM_ID) { return Err(ProgramError::InvalidAccountData); }
    msg!("owner program of metadata OK! ({})", METAPLEX_METADATA_PROGRAM_ID.to_string());

    // データサイズのチェック
    msg!("check data size...");
    // owner_signer はシステムアカウントとチェック済みなのでデータサイズは見ない
    if token.data.borrow().len() != 165 { return Err(ProgramError::InvalidAccountData); }
    msg!("data size of token OK! ({})", token.data.borrow().len());
    // metadata のデータサイズは可変なので見ない

    // データのパース
    msg!("parse account data...");
    let token_data = TokenAccount::try_from_slice(&token.data.borrow()[0..72])?;
    let metadata_data = MetadataAccount::try_from_slice(&metadata.data.borrow()[0..65])?;
    msg!("parse account data OK!");

    // owner_signer = token.owner AND token.mint = metadata.mint AND metadata.update_authority = update_authority の関係チェック
    msg!("check account relation...");
    if ! token_data.owner.eq(&owner_signer.key) { return Err(ProgramError::InvalidAccountData); }
    msg!("token.owner = owner_signer OK ({}!", owner_signer.key.to_string());
    if ! token_data.mint.eq(&metadata_data.mint) { return Err(ProgramError::InvalidAccountData); }
    msg!("token.mint = metadata.mint OK! ({})", metadata_data.mint.to_string());
    if ! metadata_data.update_authority.eq(&update_authority.key) { return Err(ProgramError::InvalidAccountData); }
    msg!("metadata.update_authority = update_authority OK! ({})", update_authority.key.to_string());

    // トークンアカウントの残高チェック
    msg!("check token amount...");
    if ! token_data.amount == 0 { return Err(ProgramError::InsufficientFunds); }
    msg!("check token amount OK! ({})", token_data.amount);

    // 成功!
    msg!("VERIFIED! signer({}) have at least 1 NFT with update_authority({}).",
         owner_signer.key.to_string(), update_authority.key.to_string());

    // もし認証してからやりたいことがあればここに書く

    Ok(())
}
