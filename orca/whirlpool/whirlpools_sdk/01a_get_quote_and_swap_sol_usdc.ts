import { PublicKey, ComputeBudgetProgram } from "@solana/web3.js";
import {
    WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PDAUtil, ORCA_WHIRLPOOLS_CONFIG, swapQuoteByInputToken, IGNORE_CACHE
} from "@orca-so/whirlpools-sdk";
import { AnchorProvider } from "@coral-xyz/anchor"; // import AnchorProvider.env() if the version of Anchor >= 0.24.0
import { DecimalUtil, Percentage } from "@orca-so/common-sdk";
import Decimal from "decimal.js";

// THIS SCRIPT REQUIRES ENVIRON VARS!!!
// bash$ export ANCHOR_PROVIDER_URL=<YOUR RPC>
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts

const provider = AnchorProvider.env(); // use AnchorProvider.env() if the version of Anchor >= 0.24.0
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());

async function main() {
    const ctx = WhirlpoolContext.from(provider.connection, provider.wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
    const fetcher = ctx.fetcher;
    const client = buildWhirlpoolClient(ctx);

    // get pool
    const SOL = {mint: new PublicKey("So11111111111111111111111111111111111111112"), decimals: 9};
    const USDC = {mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), decimals: 6};
    const tick_spacing = 64;
    const whirlpool_pubkey = PDAUtil.getWhirlpool(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        ORCA_WHIRLPOOLS_CONFIG,
        SOL.mint, USDC.mint, tick_spacing).publicKey;
    console.log("whirlpool_key", whirlpool_pubkey.toBase58());
    const whirlpool = await client.getPool(whirlpool_pubkey);

    // get swap quote
    const amount_in = new Decimal("0.0001" /* SOL */);

    const quote = await swapQuoteByInputToken(
      whirlpool,
      SOL.mint,
      DecimalUtil.toBN(amount_in, SOL.decimals), // toU64 (SOL to lamports)
      Percentage.fromFraction(10, 1000), // acceptable slippage is 1.0% (10/1000)
      ctx.program.programId,
      fetcher,
      IGNORE_CACHE,
    );

    // print quote
    console.log("aToB", quote.aToB);
    console.log("estimatedAmountIn", DecimalUtil.fromBN(quote.estimatedAmountIn, SOL.decimals).toString(), "SOL");
    console.log("estimatedAmountOut", DecimalUtil.fromBN(quote.estimatedAmountOut, USDC.decimals).toString(), "USDC");

  // Create instructions to add priority fee
  const estimated_compute_units = 300_000; // ~ 1_400_000 CU
  const additional_fee_in_lamports = 100_000; // 0.0001 SOL

  const setComputeUnitPriceIx = ComputeBudgetProgram.setComputeUnitPrice({
    // Specify how many micro lamports to pay in addition for 1 CU
    microLamports: Math.floor((additional_fee_in_lamports * 1_000_000) / estimated_compute_units),
  });
  const set_compute_unit_limit_ix = ComputeBudgetProgram.setComputeUnitLimit({
    // To determine the Solana network fee at the start of the transaction, explicitly specify CU
    // If not specified, it will be calculated automatically. But it is almost always specified
    // because even if it is estimated to be large, it will not be refunded
    units: estimated_compute_units,
  });

    // execute transaction
    console.log("preparing...");
    const tx = await whirlpool.swap(quote);
    
    tx.prependInstruction({
        instructions: [set_compute_unit_limit_ix, setComputeUnitPriceIx],
        cleanupInstructions: [],
        signers: [],
      });

    console.log("sending & confirming...")
    const signature = await tx.buildAndExecute();
    console.log("signature", signature);
    ctx.connection.confirmTransaction(signature, "confirmed");
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/01a_get_quote_and_swap_sol_usdc.ts
connection endpoint https://ssc-dao.genesysgo.net
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
whirlpool_key HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
aToB true
estimatedAmountIn 0.001 SOL
estimatedAmountOut 0.039334 USDC
signature nSMvpntXVagMJne5bSzthndowCGgvPKQsRVSD49Xkxu75Tx2QtJMp2sMChn7w9f3R45CeW2V7h6yWAm7YnYqVX3

*/
