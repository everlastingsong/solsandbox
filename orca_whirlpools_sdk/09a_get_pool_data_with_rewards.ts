import { PublicKey } from "@solana/web3.js";
import {
    WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PDAUtil, ORCA_WHIRLPOOLS_CONFIG, PriceMath, PoolUtil
} from "@orca-so/whirlpools-sdk";
import { Provider, BN } from "@project-serum/anchor";
import { MintLayout } from "@solana/spl-token";
import Decimal from "decimal.js";

// THIS SCRIPT REQUIRES ENVIRON VARS!!!
// bash$ export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts

interface TokenDefinition {
  symbol: string,
  mint: PublicKey,
  decimals: number,
}

const provider = Provider.env();
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());

async function main() {
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
    const fetcher = new AccountFetcher(ctx.connection);
    const client = buildWhirlpoolClient(ctx, fetcher);

    const config_pubkey = new PublicKey("GLGWDKtwhKm5o353KuUx7Z6iSnVVjdSRhAejvH8urX8F");
    const SOL : TokenDefinition = {symbol: "SOL", mint: new PublicKey("So11111111111111111111111111111111111111112"), decimals: 9};
    const USDC: TokenDefinition = {symbol: "devUSDC", mint: new PublicKey("FMwbjM1stnTzi74LV4cS937jeSUds7mZDgcdgnJ1yBDw"), decimals: 6};
    const tick_spacing = 64;
  
    const whirlpool_pubkey = PDAUtil.getWhirlpool(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        config_pubkey,
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
    for (let i=0; i<3; i++) {
      if ( PoolUtil.isRewardInitialized(whirlpool_data.rewardInfos[i]) ) {
        const mint_account_info = await ctx.connection.getAccountInfo(whirlpool_data.rewardInfos[i].mint);
        const mint = MintLayout.decode(mint_account_info.data.slice(0, MintLayout.span));
        const decimals = mint.decimals;
        console.log(`reward[${i}] mint`, whirlpool_data.rewardInfos[i].mint.toBase58());
        console.log(`reward[${i}] decimals`, decimals);
        console.log(`reward[${i}] vault`, whirlpool_data.rewardInfos[i].vault.toBase58());
        console.log(`reward[${i}] authority`, whirlpool_data.rewardInfos[i].authority.toBase58());
        console.log(`reward[${i}] growthGlobal`, whirlpool_data.rewardInfos[i].growthGlobalX64.toString());
        console.log(`reward[${i}] * emissionsPerSecond`, whirlpool_data.rewardInfos[i].emissionsPerSecondX64.toString());

        const emissionsPerWeek = new Decimal(whirlpool_data.rewardInfos[i].emissionsPerSecondX64
          .shrn(64)
          .muln(60*60*24*7).toString())
          .div(new Decimal(10**decimals))
          .ceil();

        //console.log(`reward[${i}] * emissionsPerWeek`, whirlpool_data.rewardInfos[i].emissionsPerSecondX64.shrn(64).muln(60*60*24*7).div(new BN(10**decimals)).toString());
        console.log(`reward[${i}] * emissionsPerWeek`, emissionsPerWeek.toString());
      }
      else {
        console.log(`reward[${i}] UNINITIALIZED`);
      }
    }
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/09a_get_pool_data_with_rewards.ts 
connection endpoint https://api.devnet.solana.com
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
whirlpool_key 7kPmSJUoJo7CtXyxv3nYBUGmEr7QpXJZ6DrGPPL8a2sn
liquidity 5137690383
sqrtPrice 5833372668713515884
tickCurrentIndex -23028
price (from tickCurrentIndex) 99.99002302959493202919796959977690631456
tokenVaultA 5o9G1zVVJo6sRcuwUuTi1TJmk3YL3fd7E9dRiahLgjpE
tokenVaultB 4ewcHt5dDzisS7BMWgpspffgRuYHLgzgV4BvBsEWKebf

reward[0] mint FMwbjM1stnTzi74LV4cS937jeSUds7mZDgcdgnJ1yBDw
reward[0] decimals 6
reward[0] vault vWrwFQ8mSiFQvzPo68EeSnbAiDedtkSEJRRJoqp1y3T
reward[0] authority r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
reward[0] growthGlobal 31111551124788591
reward[0] * emissionsPerSecond 30492467953841888821248
reward[0] * emissionsPerWeek 1000

reward[1] mint FMwbjM1stnTzi74LV4cS937jeSUds7mZDgcdgnJ1yBDw
reward[1] decimals 6
reward[1] vault HaAjndqQmiWVrrrZUSseVR7LnFFngDM59v2acPAf21Jk
reward[1] authority r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
reward[1] growthGlobal 0
reward[1] * emissionsPerSecond 30492467953841888821248
reward[1] * emissionsPerWeek 1000

reward[2] UNINITIALIZED

*/