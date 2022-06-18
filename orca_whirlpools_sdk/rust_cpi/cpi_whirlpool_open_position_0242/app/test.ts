import * as idl from "../target/idl/cpi_whirlpool_open_position_0242.json";
import type { CpiWhirlpoolOpenPosition0242 } from "../target/types/cpi_whirlpool_open_position_0242";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, AccountLayout } from "@solana/spl-token";
import { deriveATA } from "@orca-so/common-sdk";
import { PDAUtil } from "@orca-so/whirlpools-sdk";

// UNIX/Linux/Mac
// bash$ export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
// bash$ export ANCHOR_WALLET=wallet.json
// bash$ ts-node this_script.ts

async function main() {
  anchor.setProvider(anchor.AnchorProvider.env());

  const CPI_WHIRLPOOL_OPEN_POSITION_PROGRAM_ID = new anchor.web3.PublicKey("5HoNqPSwHYjs2YyUfMfd6Z95HXT55yT8Uq5BaF8fVhqq");
  const wallet = anchor.AnchorProvider.env().wallet;
  const program = new Program(idl as anchor.Idl, CPI_WHIRLPOOL_OPEN_POSITION_PROGRAM_ID, anchor.getProvider()) as Program<CpiWhirlpoolOpenPosition0242>;
  const connection = anchor.getProvider().connection;

  const whirlpoolProgram = new anchor.web3.PublicKey("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc");
  const whirlpool = new anchor.web3.PublicKey("EgxU92G34jw6QDG9RuTX9StFg1PmHuDqkRKAE5kVEiZ4");
  const funder = wallet.publicKey;
  const owner = wallet.publicKey;

  const positionMintKeypair = anchor.web3.Keypair.generate();
  const positionMint = positionMintKeypair.publicKey;
  const positionPda = PDAUtil.getPosition(whirlpoolProgram, positionMint);
  const position = positionPda.publicKey;
  const positionTokenAccount = await deriveATA(wallet.publicKey, positionMint);
  const positionBump = positionPda.bump;
  const tickLowerIndex = -122048;
  const tickUpperIndex = -108160;
  
  console.log("invoke openPosition");
  const signature = await program.rpc.openPosition(
    positionBump,
    tickLowerIndex,
    tickUpperIndex, {
      accounts: {
        whirlpoolProgram,
        funder,
        owner,
        position,
        positionMint,
        positionTokenAccount,
        whirlpool,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      },
      signers: [positionMintKeypair],
    });

  console.log("Your transaction signature", signature);
}

main();
