import { PublicKey } from "@solana/web3.js";
import {
    WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PDAUtil, ORCA_WHIRLPOOLS_CONFIG, swapQuoteWithParams, SwapUtils, swapQuoteByInputToken
} from "@orca-so/whirlpools-sdk";
import { Provider } from "@project-serum/anchor"; // import AnchorProvider.env() if the version of Anchor >= 0.24.0
import { DecimalUtil, Percentage } from "@orca-so/common-sdk";
import Decimal from "decimal.js";

// THIS SCRIPT REQUIRES ENVIRON VARS!!!
// bash$ export ANCHOR_PROVIDER_URL=https://ssc-dao.genesysgo.net
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts

const provider = Provider.env(); // use AnchorProvider.env() if the version of Anchor >= 0.24.0
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());

async function main() {
    const ctx = WhirlpoolContext.from(provider.connection, provider.wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
    const fetcher = new AccountFetcher(ctx.connection);
    const client = buildWhirlpoolClient(ctx, fetcher);

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
    const amount_in = new Decimal("0.001" /* SOL */);
    const a_to_b = true; // SOL to USDC direction
    const whirlpool_data = await whirlpool.refreshData(); // or whirlpool.getData()

    // whirlpools-sdk v0.4.0 breaking change
    const tickarrays = await SwapUtils.getTickArrays(
      whirlpool_data.tickCurrentIndex,
      whirlpool_data.tickSpacing,
      a_to_b,
      ctx.program.programId,
      whirlpool_pubkey,
      fetcher,
      true
    );

    // whirlpools-sdk v0.4.0 breaking change
    const quote = swapQuoteWithParams({
      aToB: a_to_b,
      whirlpoolData: whirlpool_data,
      tokenAmount: DecimalUtil.toU64(amount_in, SOL.decimals), // toU64 (SOL to lamports)
      amountSpecifiedIsInput: true, // tokenAmount means input amount of SOL
      sqrtPriceLimit: SwapUtils.getDefaultSqrtPriceLimit(a_to_b),
      otherAmountThreshold: SwapUtils.getDefaultOtherAmountThreshold(true /* amountSpecifiedIsInput */),
      tickArrays: tickarrays,
    },
    Percentage.fromFraction(10, 1000), // acceptable slippage is 1.0% (10/1000)
    );

    // print quote
    console.log("aToB", quote.aToB);
    console.log("estimatedAmountIn", DecimalUtil.fromU64(quote.estimatedAmountIn, SOL.decimals).toString(), "SOL");
    console.log("estimatedAmountOut", DecimalUtil.fromU64(quote.estimatedAmountOut, USDC.decimals).toString(), "USDC");

    // execute transaction
    const tx = await whirlpool.swap(quote);
    const signature = await tx.buildAndExecute();
    console.log("signature", signature);
    ctx.connection.confirmTransaction(signature, "confirmed");
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/01a_get_quote_and_swap_sol_usdc_with_params.ts 
connection endpoint https://ssc-dao.genesysgo.net
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
whirlpool_key HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
aToB true
estimatedAmountIn 0.001 SOL
estimatedAmountOut 0.03946 USDC
signature 26Vwf9xqdajFfA9uuLJE5rtCk2DgC1iSGGEah4yMnET95dQzQufFQRX6zQaMtZbN3eLGGr2vz8nA3UQLUAHibif5

*/