import { PublicKey } from "@solana/web3.js";
import {
    WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PDAUtil, ORCA_WHIRLPOOLS_CONFIG, WhirlpoolData, PoolUtil, swapQuoteWithParams, SwapUtils,
} from "@orca-so/whirlpools-sdk";
import { AnchorProvider } from "@project-serum/anchor";
import { DecimalUtil, Percentage } from "@orca-so/common-sdk";
import Decimal from "decimal.js";

// THIS SCRIPT REQUIRES ENVIRON VARS!!!
// bash$ export ANCHOR_PROVIDER_URL=https://api.mainnet-beta.solana.com
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts

const provider = AnchorProvider.env();
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());

async function main() {
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
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

    // get swap quote (EXACT OUTPUT based)
    const amount_out = new Decimal("0.001" /* SOL */);

    const a_to_b = false; // NOT (SOL to USDC direction)
    const whirlpool_data = whirlpool.getData();
    const tick_arrays = await SwapUtils.getTickArrays(
        whirlpool_data.tickCurrentIndex,
        whirlpool_data.tickSpacing,
        a_to_b,
        ctx.program.programId,
        whirlpool_pubkey,
        ctx.fetcher,
        true,
    );

    const quote = swapQuoteWithParams({
        aToB: a_to_b,
        whirlpoolData: whirlpool_data,
        tokenAmount: DecimalUtil.toU64(amount_out, SOL.decimals), // toU64 (SOL to lamports)
        otherAmountThreshold: SwapUtils.getDefaultOtherAmountThreshold(false),
        sqrtPriceLimit: SwapUtils.getDefaultSqrtPriceLimit(a_to_b),
        amountSpecifiedIsInput: false, // tokenAmount means OUTPUT amount of SOL
        //tickArrayAddresses: tick_array_address,
        tickArrays: tick_arrays
    }, Percentage.fromFraction(10, 1000), // acceptable slippage is 1.0% (10/1000)
    );

    // print quote
    console.log("aToB", quote.aToB);
    console.log("estimatedAmountIn", DecimalUtil.fromU64(quote.estimatedAmountIn, USDC.decimals).toString(), "USDC");
    console.log("estimatedAmountOut", DecimalUtil.fromU64(quote.estimatedAmountOut, SOL.decimals).toString(), "SOL");

    // execute transaction
    /*
    const tx = await whirlpool.swap(quote);
    const signature = await tx.buildAndExecute();
    console.log("signature", signature);
    ctx.connection.confirmTransaction(signature, "confirmed");
    */
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/89a_exact_output_swap.ts 
connection endpoint https://ssc-dao.genesysgo.net
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
whirlpool_key HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
aToB false
estimatedAmountIn 0.031808 USDC
estimatedAmountOut 0.001 SOL
signature 3GWU1BXkroC7ukwAtHPkCur6UzqGc3SosYrZ3aWSrg8QmvARkpVCS7LhSejuVXkDP8zP7DoX2MFhiPBRzJuLBAjy

*/
