const SDK = require("@orca-so/whirlpools-sdk");
const SDKHelper = require("@orca-so/common-sdk");
const Anchor = require("@project-serum/anchor");
const Solana = require("@solana/web3.js");
const Decimal = require("decimal.js");

// bash$ export ANCHOR_PROVIDER_URL=https://ssc-dao.genesysgo.net
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ node this_script.js
const provider = Anchor.Provider.env();
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());


async function main() {
    const ctx = SDK.WhirlpoolContext.withProvider(provider, SDK.ORCA_WHIRLPOOL_PROGRAM_ID);
    const fetcher = new SDK.AccountFetcher(ctx.connection);
    const client = SDK.buildWhirlpoolClient(ctx, fetcher);
    
    // get pool
    const SOL = {mint: new Solana.PublicKey("So11111111111111111111111111111111111111112"), decimals: 9};
    const USDC = {mint: new Solana.PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), decimals: 6};
    const tick_spacing = 64;
    const whirlpool_key = SDK.PDAUtil.getWhirlpool(
        SDK.ORCA_WHIRLPOOL_PROGRAM_ID,
        SDK.ORCA_WHIRLPOOLS_CONFIG,
        SOL.mint, USDC.mint, tick_spacing).publicKey;
    console.log("whirlpool_key", whirlpool_key.toBase58());

    // get swap quote
    const amount_in = new Decimal("0.001" /* SOL */);

    const aToB = true; // SOL to USDC direction
    const whirlpool_data = (await fetcher.getPool(whirlpool_key, true));
    const tick_array_address = SDK.PoolUtil.getTickArrayPublicKeysForSwap(
        whirlpool_data.tickCurrentIndex,
        whirlpool_data.tickSpacing,
        aToB,
        ctx.program.programId,
        whirlpool_key
    );
    const tick_array_sequence_data = await fetcher.listTickArrays(tick_array_address, true);

    const quote = SDK.swapQuoteByInputToken({
        whirlpoolAddress: whirlpool_key,
        swapTokenMint: whirlpool_data.tokenMintA, // input is SOL
        whirlpoolData: whirlpool_data,
        tokenAmount: SDKHelper.DecimalUtil.toU64(amount_in, SOL.decimals), // toU64 (SOL to lamports)
        amountSpecifiedIsInput: true, // tokenAmount means input amount of SOL
        slippageTolerance: SDKHelper.Percentage.fromFraction(10, 1000), // acceptable slippage is 1.0% (10/1000)
        tickArrayAddresses: tick_array_address,
        tickArrays: tick_array_sequence_data,
    });

    // print quote
    console.log("aToB", quote.aToB);
    console.log("estimatedAmountIn", SDKHelper.DecimalUtil.fromU64(quote.estimatedAmountIn, SOL.decimals).toString(), "SOL");
    console.log("estimatedAmountOut", SDKHelper.DecimalUtil.fromU64(quote.estimatedAmountOut, USDC.decimals).toString(), "USDC");

    // execute transaction
    const pool = await client.getPool(whirlpool_key);
    const tx = await pool.swap(quote);
    const signature = await tx.buildAndExecute();
    console.log("signature", signature);
    ctx.connection.confirmTransaction(signature, "confirmed");
}

main();

/*
SAMPLE OUTPUT

$ node src/1_get_quote_and_swap_sol_usdc.js 
connection endpoint https://ssc-dao.genesysgo.net
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
whirlpool_key HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
aToB true
estimatedAmountIn 0.001 SOL
estimatedAmountOut 0.050383 USDC
(base) carnelian:sandbox ikeyanagi$ node src/1_get_quote_and_swap_sol_usdc.js 
connection endpoint https://ssc-dao.genesysgo.net
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
whirlpool_key HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
aToB true
estimatedAmountIn 0.001 SOL
estimatedAmountOut 0.05038 USDC
signature 4ND2TeJXg9PGuPmgSEBakyY2emMUoMpqTyiXD8NhKJk4ejvxKU2dxM7MxyMNAwtgbCqBSvF4ugpUcVu3vVXQ7s72

*/
