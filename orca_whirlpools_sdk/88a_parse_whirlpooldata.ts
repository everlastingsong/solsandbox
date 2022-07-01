import { PublicKey } from "@solana/web3.js";
import {
    WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PDAUtil, ORCA_WHIRLPOOLS_CONFIG, PriceMath, ParsableWhirlpool
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

    //with client
    //const whirlpool = await client.getPool(whirlpool_pubkey);
    //const whirlpool_data = whirlpool.getData()

    //from account info
    const account_info = await ctx.connection.getAccountInfo(whirlpool_pubkey, "confirmed");
    const whirlpool_data = ParsableWhirlpool.parse(account_info.data);

    // WhirlpoolData type members: https://orca-so.github.io/whirlpools/modules.html#WhirlpoolData
    console.log("sqrtPrice", whirlpool_data.sqrtPrice.toString());
    console.log("price", PriceMath.sqrtPriceX64ToPrice(whirlpool_data.sqrtPrice, SOL.decimals, USDC.decimals).toFixed(USDC.decimals));
    console.log("liquidity", whirlpool_data.liquidity.toString());
    console.log("tickCurrentIndex", whirlpool_data.tickCurrentIndex);
    console.log("tokenVaultA", whirlpool_data.tokenVaultA.toBase58());
    console.log("tokenVaultB", whirlpool_data.tokenVaultB.toBase58());
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/88a_parse_whirlpooldata.ts 
connection endpoint https://ssc-dao.genesysgo.net
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
whirlpool_key HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
sqrtPrice 3341148276184590755
price 32.805907
liquidity 36851061826904
tickCurrentIndex -34174
tokenVaultA 3YQm7ujtXWJU2e9jhp2QGHpnn1ShXn12QjvzMvDgabpX
tokenVaultB 2JTw1fE2wz1SymWUQ7UqpVtrTuKjcd6mWwYwUJUCh2rq

*/