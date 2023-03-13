import { PublicKey } from "@solana/web3.js";
import {
    WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PDAUtil, ORCA_WHIRLPOOLS_CONFIG, WhirlpoolData, PoolUtil, swapQuoteWithParams, SwapUtils,
    swapQuoteByOutputToken,
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
    const whirlpool_pubkey = new PublicKey("CPsTfDvZYeVB5uTqQZcwwTTBJ7KPFvB6JKLGSWsFZEL7");
    const whirlpool = await client.getPool(whirlpool_pubkey);
    const SOL = whirlpool.getTokenAInfo();
    const DUST = whirlpool.getTokenBInfo();
    const tick_spacing = whirlpool.getData().tickSpacing;

    // get swap quote (EXACT OUTPUT based)
    const amount_out = new Decimal("10" /* DUST */);

    const quote = await swapQuoteByOutputToken(
        whirlpool,
        DUST.mint,
        DecimalUtil.toU64(amount_out, DUST.decimals),
        Percentage.fromFraction(1, 100),
        ORCA_WHIRLPOOL_PROGRAM_ID,
        ctx.fetcher,
        true,
    );

    // print quote
    console.log("aToB", quote.aToB);
    console.log("estimatedAmountIn", DecimalUtil.fromU64(quote.estimatedAmountIn, SOL.decimals).toString(), "SOL");
    console.log("estimatedAmountOut", DecimalUtil.fromU64(quote.estimatedAmountOut, DUST.decimals).toString(), "DUST");

}

main();

/*
SAMPLE OUTPUT

$ ts-node src/89b_exact_output_swap.ts 
connection endpoint https://api.mainnet-beta.solana.com
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
aToB true
estimatedAmountIn 0.95010573 SOL
estimatedAmountOut 10 DUST

*/
