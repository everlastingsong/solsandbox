import { PublicKey } from "@solana/web3.js";
import {
    WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PDAUtil, ORCA_WHIRLPOOLS_CONFIG, swapQuoteByInputToken, PriceMath
} from "@orca-so/whirlpools-sdk";
import { AnchorProvider } from "@project-serum/anchor";
import { DecimalUtil, Percentage } from "@orca-so/common-sdk";
import Decimal from "decimal.js";
import { AccountLayout, AccountState, RawAccount } from "@solana/spl-token"; // 0.3.7

// THIS SCRIPT REQUIRES ENVIRON VARS!!!
// bash$ export ANCHOR_PROVIDER_URL=https://api.mainnet-beta.solana.com
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts

const provider = AnchorProvider.env();
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());

async function main() {
    // with spl-token 0.3.7
    const state: AccountState = AccountState.Initialized;
    console.log(`AccountState.Initialized = ${state}`);

    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
    const fetcher = new AccountFetcher(ctx.connection);
    const client = buildWhirlpoolClient(ctx);

    // get pool
    const USDC = {mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), decimals: 6, symbol: "USDC"};
    const USDT = {mint: new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"), decimals: 6, symbol: "USDT"};
    const TICK_SPACING_STABLE = 1;

    const token_a = USDC;
    const token_b = USDT;
    const tick_spacing = TICK_SPACING_STABLE;

    const whirlpool_pubkey = PDAUtil.getWhirlpool(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        ORCA_WHIRLPOOLS_CONFIG,
        token_a.mint, token_b.mint, tick_spacing).publicKey;
    console.log("whirlpool_key", whirlpool_pubkey.toBase58());
    const whirlpool = await client.getPool(whirlpool_pubkey);

    // get swap quote
    const input_token = token_b; // a:USDC, b: USDT
    const amount_in = new Decimal("0.01");
    const output_token = input_token === token_a ? token_b : token_a;

    const quote = await swapQuoteByInputToken(
      whirlpool,
      input_token.mint,
      DecimalUtil.toU64(amount_in, input_token.decimals),
      Percentage.fromFraction(10, 1000),
      ctx.program.programId,
      fetcher,
      true,
    );

    console.log("tickarrays: ", quote.tickArray0.toBase58(), quote.tickArray1.toBase58(), quote.tickArray2.toBase58());

    // print quote
    console.log("aToB", quote.aToB);
    console.log("estimatedAmountIn", DecimalUtil.fromU64(quote.estimatedAmountIn, input_token.decimals).toString(), input_token.symbol);
    console.log("estimatedAmountOut", DecimalUtil.fromU64(quote.estimatedAmountOut, output_token.decimals).toString(), output_token.symbol);
    const rate = DecimalUtil.fromU64(quote.estimatedAmountIn, input_token.decimals).div(DecimalUtil.fromU64(quote.estimatedAmountOut, output_token.decimals));
    console.log(PriceMath.sqrtPriceX64ToPrice(whirlpool.getData().sqrtPrice, token_a.decimals, token_b.decimals));
    console.log(rate.toString());

    // execute transaction
    // const tx = await whirlpool.swap(quote);
    // const signature = await tx.buildAndExecute();
    // console.log("signature", signature);
    // ctx.connection.confirmTransaction(signature, "confirmed");    
}

main();

/*

SAMPLE OUTPUT

$ ts-node src/01_get_quote_and_swap_usdc_usdt.ts 
connection endpoint https://api.mainnet-beta.solana.com
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
AccountState.Initialized = 1
whirlpool_key 4fuUiYxTQ6QCrdSq9ouBYcTM7bqSwYTSyLueGZLTy4T4
tickarrays:  8kZSTVuV7C4GD9ZVR4wDtRSXv1SvsSQPfqUbthueRNGV 8kZSTVuV7C4GD9ZVR4wDtRSXv1SvsSQPfqUbthueRNGV 8kZSTVuV7C4GD9ZVR4wDtRSXv1SvsSQPfqUbthueRNGV
aToB false
estimatedAmountIn 0.01 USDT
estimatedAmountOut 0.01 USDC
0.9998259752012860829851762038371891779784
1

*/