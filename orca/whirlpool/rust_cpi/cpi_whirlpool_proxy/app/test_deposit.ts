import * as idl from "../target/idl/cpi_whirlpool_proxy.json";
import type { CpiWhirlpoolProxy } from "../target/types/cpi_whirlpool_proxy";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { deriveATA, Percentage, DecimalUtil } from "@orca-so/common-sdk";
import { AccountFetcher, increaseLiquidityQuoteByInputTokenWithParams, ORCA_WHIRLPOOL_PROGRAM_ID, PDAUtil } from "@orca-so/whirlpools-sdk";
import Decimal from "decimal.js";

// UNIX/Linux/Mac
// bash$ export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts

async function main() {
  anchor.setProvider(anchor.AnchorProvider.env());

  const devSAMO = {symbol: "devSAMO", mint: new anchor.web3.PublicKey("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"),  decimals: 9};
  const devUSDC = {symbol: "devUSDC", mint: new anchor.web3.PublicKey("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6};
  const whirlpool_pubkey = new anchor.web3.PublicKey("EgxU92G34jw6QDG9RuTX9StFg1PmHuDqkRKAE5kVEiZ4");

  const PROXY_PROGRAM_ID = new anchor.web3.PublicKey("GBzoew3zF7XXtxfHzW5xtFVboKkbHxXmBVcYRXcs1MoV");
  const wallet = anchor.AnchorProvider.env().wallet;
  const program = new Program(idl as anchor.Idl, PROXY_PROGRAM_ID, anchor.getProvider()) as Program<CpiWhirlpoolProxy>;

  const fetcher = new AccountFetcher(anchor.getProvider().connection);
  const whirlpool_data = await fetcher.getPool(whirlpool_pubkey);

  const position_mint_keypair = anchor.web3.Keypair.generate();
  const position_mint = position_mint_keypair.publicKey;
  const position_pda = PDAUtil.getPosition(ORCA_WHIRLPOOL_PROGRAM_ID, position_mint);
  const position = position_pda.publicKey;
  const position_token_account = await deriveATA(wallet.publicKey, position_mint);
  const tick_lower_index = -122048;
  const tick_upper_index = -108160;

  const metadata_program = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"); // constant
  const metadata_update_auth = new anchor.web3.PublicKey("3axbTs2z5GBy6usVbNVoqEgZMng3vZvMnAoX29BFfwhr"); // constant
  const position_metadata_pda = PDAUtil.getPositionMetadata(position_mint);
  const position_metadata = position_metadata_pda.publicKey;

  const token_owner_a = await deriveATA(wallet.publicKey, devSAMO.mint);
  const token_owner_b = await deriveATA(wallet.publicKey, devUSDC.mint);

  const signature1 = await program.rpc.proxyOpenPositionWithMetadata(
    position_pda.bump,
    position_metadata_pda.bump,
    tick_lower_index,
    tick_upper_index, {
    accounts: {
      whirlpoolProgram: ORCA_WHIRLPOOL_PROGRAM_ID,
      whirlpool: whirlpool_pubkey,
      funder: wallet.publicKey,
      owner: wallet.publicKey,
      position: position,
      positionMint: position_mint,
      positionTokenAccount: position_token_account,
      metadataProgram: metadata_program,
      metadataUpdateAuth: metadata_update_auth,
      positionMetadataAccount: position_metadata,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    },
    signers: [position_mint_keypair],
  });
  console.log("proxyOpenPositionWithMetadata signature", signature1);  

  const quote = increaseLiquidityQuoteByInputTokenWithParams({
    inputTokenMint: devSAMO.mint,
    inputTokenAmount: DecimalUtil.toU64(new Decimal("1"), devSAMO.decimals),
    tickCurrentIndex: whirlpool_data.tickCurrentIndex,
    tickLowerIndex: tick_lower_index,
    tickUpperIndex: tick_upper_index,
    sqrtPrice: whirlpool_data.sqrtPrice,
    slippageTolerance: Percentage.fromDecimal(new Decimal("1")),
    tokenMintA: whirlpool_data.tokenMintA,
    tokenMintB: whirlpool_data.tokenMintB,
  });
  const tick_array_lower_pubkey = PDAUtil.getTickArrayFromTickIndex(tick_lower_index, whirlpool_data.tickSpacing, whirlpool_pubkey, ORCA_WHIRLPOOL_PROGRAM_ID).publicKey;
  const tick_array_upper_pubkey = PDAUtil.getTickArrayFromTickIndex(tick_upper_index, whirlpool_data.tickSpacing, whirlpool_pubkey, ORCA_WHIRLPOOL_PROGRAM_ID).publicKey;

  const signature2 = await program.rpc.proxyIncreaseLiquidity(
    quote.liquidityAmount,
    quote.tokenMaxA,
    quote.tokenMaxB, {
    accounts: {
      whirlpoolProgram: ORCA_WHIRLPOOL_PROGRAM_ID,
      whirlpool: whirlpool_pubkey,
      positionAuthority: wallet.publicKey,
      position: position,
      positionTokenAccount: position_token_account,
      tickArrayLower: tick_array_lower_pubkey,
      tickArrayUpper: tick_array_upper_pubkey,
      tokenOwnerAccountA: token_owner_a,
      tokenVaultA: whirlpool_data.tokenVaultA,
      tokenOwnerAccountB: token_owner_b,
      tokenVaultB: whirlpool_data.tokenVaultB,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
    signers: [],
  });
  console.log("proxyIncreaseLiquidity signature", signature2);  
}

main();
