import { PublicKey } from "@solana/web3.js";
import {
    WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PDAUtil, ORCA_WHIRLPOOLS_CONFIG, PriceMath
} from "@orca-so/whirlpools-sdk";
import { Provider } from "@project-serum/anchor";

// THIS SCRIPT REQUIRES ENVIRON VARS!!!
// bash$ export ANCHOR_PROVIDER_URL=https://ssc-dao.genesysgo.net
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts

const provider = Provider.env();
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());

async function main() {
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
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
    const whirlpool_data = whirlpool.getData()

    // WhirlpoolData type members: https://orca-so.github.io/whirlpools/modules.html#WhirlpoolData
    console.log("liquidity", whirlpool_data.liquidity.toString());
    console.log("sqrtPrice", whirlpool_data.sqrtPrice.toString());
    console.log("tickCurrentIndex", whirlpool_data.tickCurrentIndex);
    console.log("price (from tickCurrentIndex)", PriceMath.tickIndexToPrice(whirlpool_data.tickCurrentIndex, SOL.decimals, USDC.decimals));
    console.log("tokenVaultA", whirlpool_data.tokenVaultA.toBase58());
    console.log("tokenVaultB", whirlpool_data.tokenVaultB.toBase58());
}

main();

/*
SAMPLE OUTPUT

$ ts-node 94a_get_pool_data.ts 
connection endpoint https://ssc-dao.genesysgo.net
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
whirlpool_key HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
liquidity 73059271256984
sqrtPrice 4042853505610528580
tickCurrentIndex -30361
price (from tickCurrentIndex) 48.02909983910074965674743507092132424696
tokenVaultA 3YQm7ujtXWJU2e9jhp2QGHpnn1ShXn12QjvzMvDgabpX
tokenVaultB 2JTw1fE2wz1SymWUQ7UqpVtrTuKjcd6mWwYwUJUCh2rq

*/
