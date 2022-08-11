import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { AnchorProvider } from "@project-serum/anchor";
import { deriveATA, TransactionBuilder } from "@orca-so/common-sdk";
import { Token, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

// スクリプト実行前に環境変数定義が必要
// ANCHOR_PROVIDER_URL=https://ssc-dao.genesysgo.net
// ANCHOR_WALLET=wallet.json

async function main() {
  const provider = AnchorProvider.env();

  console.log("endpoint:", provider.connection.rpcEndpoint);
  console.log("wallet pubkey:", provider.wallet.publicKey.toBase58());

  const USDC = {mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), decimals: 6};

  // アカウント関係図
  // wallet.publicKey
  //   └ parent_ata
  //       └ nest_ata

  // オーナーになってしまったATAのアドレス (ネストATAのトークンの送り先でもある)
  const parent_ata = await deriveATA(provider.wallet.publicKey, USDC.mint);
  console.log("parent ATA", parent_ata.toBase58());

  // ネストATAのアドレス
  // allowOwnerOffCurve = true が重要 (PDAであるATAをオーナーにするため)
  // (allowOwnerOffCurve = true が指定できない deriveATA では対応できない)
  const nested_ata = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    USDC.mint,
    parent_ata,
    true
  );
  console.log("nested ATA", nested_ata.toBase58());

  // RecoverNested 命令生成
  const recover_nested_ix = new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: nested_ata, isWritable: true, isSigner: false },   // Nested ATA (token source)
      { pubkey: USDC.mint, isWritable: false, isSigner: false },   // Token mint for the nested ATA
      { pubkey: parent_ata, isWritable: true, isSigner: false },   // Wallet's ATA (token destination)
      { pubkey: parent_ata, isWritable: false, isSigner: false },  // Owner ATA
      { pubkey: USDC.mint, isWritable: false, isSigner: false },   // Token mint for the owner ATA
      { pubkey: provider.wallet.publicKey, isWritable: true, isSigner: true }, // Wallet address for the owner ATA
      { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
    ],
    data: Buffer.from([2]), // 0: Create, 1: CreateIdempotent, 2: RecoverNested
  });

  const transaction = new TransactionBuilder(provider.connection, provider.wallet);
  transaction.addInstruction({instructions: [recover_nested_ix], cleanupInstructions: [], signers: []});
  const signature = await transaction.buildAndExecute();
  console.log("signature", signature);
  provider.connection.confirmTransaction(signature, "confirmed");
}

main();

/*

SAMPLE OUTPUT:
$ ts-node recover_nested_ata.ts
endpoint: https://ssc-dao.genesysgo.net
wallet pubkey: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
parent ATA yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
nested ATA zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
signature ssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss

DEVNET TEST TRANSACTION:
https://solscan.io/tx/5HiTD1kzYSgDG4ioxhUtfCXJ1j2uctgkQxYVaw4p31QFHvLusoJ1SGWAt11ieCUgTjzi4ZptYFSWmb9taZi6JCny?cluster=devnet

Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL invoke [1]
Program log: RecoverNested
Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]
Program log: Instruction: TransferChecked
Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 6082 of 182061 compute units
Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success
Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]
Program log: Instruction: CloseAccount
Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 3023 of 173088 compute units
Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success
Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL consumed 30231 of 200000 compute units
Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL success

*/