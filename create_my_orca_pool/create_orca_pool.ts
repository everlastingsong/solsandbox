import { Keypair, Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, Token, MintLayout, AccountLayout } from '@solana/spl-token';
import * as BufferLayout from '@solana/buffer-layout';
import * as assert from 'assert';

const RPC_ENDPOINT_URL = "https://api.devnet.solana.com";

// 定数: https://github.com/orca-so/typescript-sdk/blob/main/src/public/utils/constants.ts
const ORCA_TOKEN_SWAP_ID = new PublicKey("9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP");
const DEVNET_ORCA_TOKEN_SWAP_ID = new PublicKey("3xQ8SWv2GaFXXpHZNqkXsdxq5DZciHBz6ZFoPPfbFd7U");
// アカウントサイズは既存のプールから探る: https://github.com/orca-so/typescript-sdk/blob/main/src/constants/pools.ts
// (mainnet) solana account EGZ7tiLeH62TPV1gL8WwbXGzEPa9zmcpVnnkPKKnrE2U
// (mainnet) solana account Dqk7mHQBx2ZWExmyrR2S8X6UG75CrbbpK2FSBZsNYsw6
const ORCA_TOKEN_SWAP_ACCOUNT_LEN = 324;

const commitment = 'confirmed';
const connection = new Connection(RPC_ENDPOINT_URL, commitment);

// ~/.config/solana/id.json の秘密鍵をウォレットとして使う
const id_json_path = require('os').homedir() + "/.config/solana/id.json";
const secret = Uint8Array.from(JSON.parse(require("fs").readFileSync(id_json_path)));
const wallet = Keypair.fromSecretKey(secret as Uint8Array);

interface FeeStructure {
    trade_fee_numerator: number,
    trade_fee_denominator: number,
    owner_fee_numerator: number,
    owner_fee_denominator: number,
}

// PDA の seeds が address のみか検証 (検証が終わったので実行しなくてもOK)
async function verify_pda_seeds() {
    // Devnet の ORCA/SOL のプールの address と authority の関係を確認
    const devnet_orca_sol_pool_address = new PublicKey("B4v9urCKnrdCMWt7rEPyA5xyuEeYQv4aDpCfGFVaCvox");
    const devnet_orca_sol_pool_authority = new PublicKey("38Q2148y3BKU6pDUfv1zpeEeKNuDHBH34WdEwo5EiTfe");
    const devnet_orca_sol_pool_nonce = 252;

    // seeds は address のみ
    const [pda, bump] = await PublicKey.findProgramAddress(
        [devnet_orca_sol_pool_address.toBuffer()],
        DEVNET_ORCA_TOKEN_SWAP_ID,
    );

    console.log("verify_pda_seeds", "devnet_orca_sol_pool_authority", devnet_orca_sol_pool_authority.toBase58(), "nonce", devnet_orca_sol_pool_nonce);
    console.log("verify_pda_seeds", "pda", pda.toBase58(), "bump", bump);
    assert.equal(pda.toBase58(), devnet_orca_sol_pool_authority.toBase58());
    assert.equal(bump, devnet_orca_sol_pool_nonce);
}

async function create_orca_constant_product_pool(
    orca_swap_program_id: PublicKey,
    token_A_deposit: PublicKey,
    token_B_deposit: PublicKey,
    fee_structure: FeeStructure
) {
    // 新規作成するアカウントのアドレス生成
    const address_keypair = Keypair.generate();
    const address = address_keypair.publicKey;
    const pool_token_mint_keypair = Keypair.generate();
    const pool_token_mint = pool_token_mint_keypair.publicKey;
    const fee_account_keypair = Keypair.generate();
    const fee_account = fee_account_keypair.publicKey;

    // PDAである authority を求める
    const [authority, nonce] = await PublicKey.findProgramAddress(
        [address.toBuffer()],
        orca_swap_program_id);

    // 関係するアカウントのアドレスが確定
    console.log("address", address.toBase58());
    console.log("authority", authority.toBase58(), "nonce", nonce);
    console.log("pool_token_mint", pool_token_mint.toBase58());
    console.log("fee_account", fee_account.toBase58());
    console.log("token_A_deposit", token_A_deposit.toBase58());
    console.log("token_B_deposit", token_B_deposit.toBase58());

    const init_transaction = new Transaction();

    // 新規トークンを作成, authority は authority にする, decimals は他にあわせて 6
    const pool_token_mint_lamports = await connection.getMinimumBalanceForRentExemption(MintLayout.span);
    init_transaction
    .add(SystemProgram.createAccount({
        newAccountPubkey: pool_token_mint,
        fromPubkey: wallet.publicKey,
        lamports: pool_token_mint_lamports,
        space: MintLayout.span,
        programId: TOKEN_PROGRAM_ID}))
    .add(Token.createInitMintInstruction(
        TOKEN_PROGRAM_ID,
        pool_token_mint,
        6,
        authority,
        null));

    // fee アカウントを作る (ownerをどうすればいいかわからないので wallet にしておく (PDAにはできないためauthorityは使えない))
    const fee_account_lamports = await connection.getMinimumBalanceForRentExemption(AccountLayout.span);
    init_transaction
    .add(SystemProgram.createAccount({
        newAccountPubkey: fee_account,
        fromPubkey: wallet.publicKey,
        lamports: fee_account_lamports,
        space: AccountLayout.span,
        programId: TOKEN_PROGRAM_ID}))
    .add(Token.createInitAccountInstruction(
        TOKEN_PROGRAM_ID,
        pool_token_mint,
        fee_account,
        wallet.publicKey));

    // デポジット用のトークンアカウントの所有者変更
    init_transaction
    .add(Token.createSetAuthorityInstruction(
        TOKEN_PROGRAM_ID,
        token_A_deposit,
        authority,
        'AccountOwner',
        wallet.publicKey,
        []))
    .add(Token.createSetAuthorityInstruction(
        TOKEN_PROGRAM_ID,
        token_B_deposit,
        authority,
        'AccountOwner',
        wallet.publicKey,
        []));

    // アカウント生成 & 初期化
    const address_lamports = await connection.getMinimumBalanceForRentExemption(ORCA_TOKEN_SWAP_ACCOUNT_LEN);
    init_transaction
    .add(SystemProgram.createAccount({
        newAccountPubkey: address,
        fromPubkey: wallet.publicKey,
        lamports: address_lamports,
        space: ORCA_TOKEN_SWAP_ACCOUNT_LEN,
        programId: orca_swap_program_id}));

    // Devnet の ETH/USDC プール初期化時のトランザクションを参考に組み立てる
    // https://explorer.solana.com/tx/33NQwKdoA8VWfAba8Uo8jtqHoP4bcwjptev9HMhusxDEgc6y2wtpSmCrXKzTaWRmuFKR7UN4aMssxE7EQCy7z3vr?cluster=devnet
    // https://solscan.io/tx/33NQwKdoA8VWfAba8Uo8jtqHoP4bcwjptev9HMhusxDEgc6y2wtpSmCrXKzTaWRmuFKR7UN4aMssxE7EQCy7z3vr?cluster=devnet
    // ※使われてなさそうなプールの address で関連するトランザクションで最古のものを探せば見つかる
    const keys = [
        { pubkey: address, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: false, isWritable: false },
        { pubkey: token_A_deposit, isSigner: false, isWritable: false },
        { pubkey: token_B_deposit, isSigner: false, isWritable: false },
        { pubkey: pool_token_mint, isSigner: false, isWritable: true },
        { pubkey: fee_account, isSigner: false, isWritable: true },
        { pubkey: fee_account, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    // トランザクションログに加えて SPL Token-Swap のコードを参考にする
    // https://github.com/solana-labs/solana-program-library/blob/master/token-swap/js/src/index.ts
    // ※Orca の Discord にて下記コメントがあった
    //   scuba | Orca 2022/01/01
    //   our program is very similar to https://spl.solana.com/token-swap so this will definitely help you launch your own pools
    // https://discord.com/channels/798712664590254081/838660851178274866/926525811526344735
    const instruction_data = Buffer.alloc(99);
    const instruction_data_layout = BufferLayout.struct([
        /* 2バイト目の unknown 以外は spl-token-swap と同じ */
        BufferLayout.u8('instruction'),
        BufferLayout.u8('nonce'), /* SPL-Token-Swap にはない, Orca では2バイト目が PDA の nonce) */
        BufferLayout.nu64('tradeFeeNumerator'),
        BufferLayout.nu64('tradeFeeDenominator'),
        BufferLayout.nu64('ownerTradeFeeNumerator'),
        BufferLayout.nu64('ownerTradeFeeDenominator'),
        BufferLayout.nu64('ownerWithdrawFeeNumerator'),
        BufferLayout.nu64('ownerWithdrawFeeDenominator'),
        BufferLayout.nu64('hostFeeNumerator'),
        BufferLayout.nu64('hostFeeDenominator'),
        BufferLayout.u8('curveType'),
        BufferLayout.blob(32, 'curveParameters'),
    ]);
    instruction_data_layout.encode(
        {
            instruction:                 0x00, /* Init */
            nonce:                       nonce,
            tradeFeeNumerator:           fee_structure.trade_fee_numerator,
            tradeFeeDenominator:         fee_structure.trade_fee_denominator,
            ownerTradeFeeNumerator:      fee_structure.owner_fee_numerator,
            ownerTradeFeeDenominator:    fee_structure.owner_fee_denominator,
            ownerWithdrawFeeNumerator:   0,
            ownerWithdrawFeeDenominator: 0,
            hostFeeNumerator:            0,
            hostFeeDenominator:          0,
            // ConstantProduct は以降とりあえず0でよい (見つけたトランザクションからわかる)
            curveType:                   0, /* ConstantProduct */
            curveParameters:             Buffer.alloc(32), /* allocは0クリアされている */
        },
        instruction_data,
    );

    init_transaction
    .add(new TransactionInstruction({
        keys,
        programId: orca_swap_program_id,
        data: instruction_data}));

    // 実行
    const tx = await connection.sendTransaction(
        init_transaction,
        [wallet, address_keypair, pool_token_mint_keypair, fee_account_keypair],
    );
    console.log("\ttx signature", tx);
    await connection.confirmTransaction(tx, commitment);

    return {
        address: address.toBase58(),
        authority: authority.toBase58(),
        nonce,
        pool_token_mint: pool_token_mint.toBase58(),
        fee_account: fee_account.toBase58(),
        token_A_deposit: token_A_deposit.toBase58(),
        token_B_deposit: token_B_deposit.toBase58(),
        fee_structure,
    }
}


async function main() {
    // PDAの導出方法を確認
    await verify_pda_seeds();

    console.log("wallet", wallet.publicKey.toBase58());

    // WrappedSOL
    const TokenA = new Token(
        connection,
        new PublicKey("So11111111111111111111111111111111111111112"),
        TOKEN_PROGRAM_ID,
        wallet);
    // 自作(walletがauthority)のdecimals=6のトークン (USDCのつもりで使っている)
    const TokenB = new Token(
        connection,
        new PublicKey("FMwbjM1stnTzi74LV4cS937jeSUds7mZDgcdgnJ1yBDw"),
        TOKEN_PROGRAM_ID,
        wallet);

    // プールのデポジットとして使用するアカウントを作成 (同じ価値のトークンを入れておく, 1SOL=100USDC)
    // 一方がSOLの場合は WrappedSOL 用のアカウントを作る
    const token_A_deposit = await Token.createWrappedNativeAccount(
        connection,
        TOKEN_PROGRAM_ID,
        wallet.publicKey,
        wallet,
        1000000000 /* lamports = 1 SOL */);
    const token_B_deposit = await TokenB.createAccount(wallet.publicKey);
    await TokenB.mintTo(
        token_B_deposit,
        wallet,
        [],
        100000000 /* μUSDC = 100 USDC */);

    console.log("wrapped_sol_deposit", token_A_deposit.toBase58(), "amount", (await TokenA.getAccountInfo(token_A_deposit)).amount.toNumber());
    console.log("devnet_usdc_deposit", token_B_deposit.toBase58(), "amount", (await TokenB.getAccountInfo(token_B_deposit)).amount.toNumber());

    const fee_structure: FeeStructure = {
        trade_fee_numerator: 25,
        trade_fee_denominator: 10000,
        owner_fee_numerator: 5,
        owner_fee_denominator: 10000,
    }

    const pool_config = await create_orca_constant_product_pool(
        // 作成するネットワークにより切り替え
        DEVNET_ORCA_TOKEN_SWAP_ID,
        token_A_deposit,
        token_B_deposit,
        fee_structure);
  
    console.log("create_orca_constant_product_pool SUCCESS!");
    console.log("\taddress        ", pool_config.address);
    console.log("\tauthority      ", pool_config.authority, pool_config.nonce);
    console.log("\tpool_token_mint", pool_config.pool_token_mint);
    console.log("\tfee_account    ", pool_config.fee_account);
    console.log("\ttoken_A        ", TokenA.publicKey.toBase58());
    console.log("\ttoken_B        ", TokenB.publicKey.toBase58());
    console.log("\ttoken_A_deposit", pool_config.token_A_deposit);
    console.log("\ttoken_B_deposit", pool_config.token_B_deposit);
    console.log("\ttrade_fee      ", pool_config.fee_structure.trade_fee_numerator, "/", pool_config.fee_structure.trade_fee_denominator);
    console.log("\towner_fee      ", pool_config.fee_structure.owner_fee_numerator, "/", pool_config.fee_structure.owner_fee_denominator);
}

main();

/*
Devnetにおける実行記録

tx signature 2D5WHqCKMfPrq3oMLvqBZSNXhxkzjh4nbvnpp8Xk21CVXqwH7qKN9oMWDTnXb7WXF8T3F7RvGau21HgKWw3Zv1RE
create_orca_constant_product_pool SUCCESS!
        address         3CbxF5jLJux7JwRceWkfLZZME8jFZWenvHwwo3ko2XKg
        authority       22b7ZrVsaY7jrvYeGv5DqbZR5rqYTRFocc97TYAawhjp 253
        pool_token_mint B3jS5cq1rVGXN4smYoAagq9UtYJcKxA6P5buaRBpsRXb
        fee_account     2Fqu8eq8fFLjgyTB5cZAZt3bTMJw48oT2Np6dkJKhcB6
        token_A         So11111111111111111111111111111111111111112
        token_B         FMwbjM1stnTzi74LV4cS937jeSUds7mZDgcdgnJ1yBDw
        token_A_deposit 6QRQnqSUDdgjWSpdXizK2hZ8HKfLiDogDaF1Edkq32Ev
        token_B_deposit 3mdEwkuwPEQyEG2qRH23khcb6xDvqfmbtQ4k5VPr27h6
        trade_fee       25 / 10000
        owner_fee       5 / 10000
 */
