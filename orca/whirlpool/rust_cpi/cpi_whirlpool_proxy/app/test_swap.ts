import * as idl from "../target/idl/cpi_whirlpool_proxy.json";
import type { CpiWhirlpoolProxy } from "../target/types/cpi_whirlpool_proxy";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { deriveATA, Percentage, DecimalUtil } from "@orca-so/common-sdk";
import { AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, PoolUtil, swapQuoteWithParams } from "@orca-so/whirlpools-sdk";
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

  // get swap quote
  const amount_in = new Decimal("1" /* devSAMO */);
  const a_to_b = true; // devSAMO to devUSDC direction
  const tick_array_address = PoolUtil.getTickArrayPublicKeysForSwap(
    whirlpool_data.tickCurrentIndex,
    whirlpool_data.tickSpacing,
    a_to_b,
    ORCA_WHIRLPOOL_PROGRAM_ID,
    whirlpool_pubkey
  );
  const tick_array_sequence_data = await fetcher.listTickArrays(tick_array_address, true);

  const quote = swapQuoteWithParams({
    aToB: a_to_b,
    whirlpoolData: whirlpool_data,
    tokenAmount: DecimalUtil.toU64(amount_in, devSAMO.decimals),
    amountSpecifiedIsInput: true,
    slippageTolerance: Percentage.fromFraction(10, 1000), // acceptable slippage is 1.0% (10/1000)
    tickArrayAddresses: tick_array_address,
    tickArrays: tick_array_sequence_data,
  });

  const token_owner_a = await deriveATA(wallet.publicKey, devSAMO.mint);
  const token_owner_b = await deriveATA(wallet.publicKey, devUSDC.mint);
  const oracle = new anchor.web3.PublicKey("3dWJWYaTPMoADQvVihAc8hFu4nYXsEtBAGQwPMBXau1t");

  const signature = await program.rpc.proxySwap(
    quote.amount,
    quote.otherAmountThreshold,
    quote.sqrtPriceLimit,
    quote.amountSpecifiedIsInput,
    quote.aToB, {
      accounts: {
        whirlpool: whirlpool_pubkey,
        tokenAuthority: wallet.publicKey,
        tokenOwnerAccountA: token_owner_a,
        tokenVaultA: whirlpool_data.tokenVaultA,
        tokenOwnerAccountB: token_owner_b,
        tokenVaultB: whirlpool_data.tokenVaultB,
        tickArray0: tick_array_address[0],
        tickArray1: tick_array_address[1],
        tickArray2: tick_array_address[2],
        oracle: oracle,
        whirlpoolProgram: ORCA_WHIRLPOOL_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      signers: [],
  });
  console.log("proxySwap signature", signature);  
}

main();
