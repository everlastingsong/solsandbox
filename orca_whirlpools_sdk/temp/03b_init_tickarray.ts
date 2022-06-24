import { PublicKey, Keypair } from "@solana/web3.js";
import {
    WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PDAUtil, WhirlpoolData, PoolUtil, swapQuoteByInputToken, WhirlpoolIx, PriceMath, toTx, TickUtil
} from "@orca-so/whirlpools-sdk";
import { Provider } from "@project-serum/anchor";
import { DecimalUtil, Percentage, Instruction, TransactionBuilder } from "@orca-so/common-sdk";
import assert from "assert";
import Decimal from "decimal.js";
//import { Instruction } from "@orca-so/whirlpools-sdk";
//import { Instruction, TransactionBuilder } from "@orca-so/sdk";

// bash$ export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts
const provider = Provider.env();
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());

// from whirlpool-sdk
const DEVNET_ORCA_WHIRLPOOLS_CONFIG = new PublicKey("847gd7SckNwJetbjf22ktip9vAtKWPMY4ntdr6CdCsJj");

function print_whirlpool_data(whirlpool_data: WhirlpoolData, token_a_decimals: number, token_b_decimals: number) {
    console.log("feeGrowthGlobalA", whirlpool_data.feeGrowthGlobalA.toString());
    console.log("feeGrowthGlobalB", whirlpool_data.feeGrowthGlobalB.toString());
    console.log("feeRate", whirlpool_data.feeRate, "=", new Decimal(whirlpool_data.feeRate).div(1000000).mul(100).toFixed(3), "%");
    console.log("liquidity", whirlpool_data.liquidity.toString());
    console.log("protocolFeeOwedA", whirlpool_data.protocolFeeOwedA.toString());
    console.log("protocolFeeOwedB", whirlpool_data.protocolFeeOwedB.toString());
    console.log("protocolFeeRate", whirlpool_data.protocolFeeRate, "=", new Decimal(whirlpool_data.protocolFeeRate).div(10000).mul(100).toFixed(3), "%");
    console.log("protocolFeeRate x feeRate", new Decimal(whirlpool_data.protocolFeeRate).div(10000).mul(whirlpool_data.feeRate).div(1000000).mul(100).toFixed(3), "%");
    console.log("rewardInfos");
    whirlpool_data.rewardInfos.map((rewardInfo) => {
        console.log("  reward.mint", rewardInfo.mint.toBase58());
        console.log("    vault", rewardInfo.vault.toBase58());
        console.log("    authority", rewardInfo.authority.toBase58());
        console.log("    emissionsPerSecondX64", rewardInfo.emissionsPerSecondX64.toString());
        console.log("    growthGlobalX64", rewardInfo.growthGlobalX64.toString());
    });
    console.log("rewardLastUpdatedTimestamp", whirlpool_data.rewardLastUpdatedTimestamp.toString());
    console.log("sqrtPrice", whirlpool_data.sqrtPrice.toString());
    console.log("price", PriceMath.sqrtPriceX64ToPrice(whirlpool_data.sqrtPrice, token_a_decimals, token_b_decimals).toString());
    console.log("tickCurrentIndex", whirlpool_data.tickCurrentIndex);
    console.log("tickSpacing", whirlpool_data.tickSpacing);
    console.log("tokenMintA", whirlpool_data.tokenMintA.toBase58());
    console.log("tokenMintB", whirlpool_data.tokenMintB.toBase58());
    console.log("tokenVaultA", whirlpool_data.tokenVaultA.toBase58());
    console.log("tokenVaultB", whirlpool_data.tokenVaultB.toBase58());
    console.log("whirlpoolBump", whirlpool_data.whirlpoolBump);
    console.log("whirlpoolsConfig", whirlpool_data.whirlpoolsConfig.toBase58());
}

async function main() {
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
    const fetcher = new AccountFetcher(ctx.connection);
    const client = buildWhirlpoolClient(ctx, fetcher);

    const SOL = {mint: new PublicKey("So11111111111111111111111111111111111111112"), decimals: 9};
    const USDC = {mint: new PublicKey("AbixiHWAh6W7rtj7jKqV4Lt73kZWy5usanioVZjvPoqe"), decimals: 6};
    const tick_spacing = 64;

    console.log("ORCA_WHIRLPOOL_PROGRAM_ID", ORCA_WHIRLPOOL_PROGRAM_ID.toBase58());
    console.log("ORCA_WHIRLPOOLS_CONFIG", DEVNET_ORCA_WHIRLPOOLS_CONFIG.toBase58());

    const whirlpool_pda = PDAUtil.getWhirlpool(
        ORCA_WHIRLPOOL_PROGRAM_ID, DEVNET_ORCA_WHIRLPOOLS_CONFIG,
        SOL.mint, USDC.mint, tick_spacing);
    console.log("whirlpool_pda.publicKey", whirlpool_pda.publicKey.toBase58());

    const whirlpool_data = (await fetcher.getPool(whirlpool_pda.publicKey, true)) as WhirlpoolData;
    print_whirlpool_data(whirlpool_data, SOL.decimals, USDC.decimals);
    

    console.log("tickIndex for 100USDC/SOL", PriceMath.priceToTickIndex(new Decimal(100), SOL.decimals, USDC.decimals));
    // decimal差を考慮すると 1000USDC/SOL で 1/1 となり tick index が 0 になるはず
    // 100USDC/SOL の状態は 100 ではなく内部的には 0.1 状態。つまり 1 より小さいので index はネガティブ。
    console.log("tickIndex for 1000USDC/SOL", PriceMath.priceToTickIndex(new Decimal(1000), SOL.decimals, USDC.decimals));
    
    // SOL価格 1 - 2000 USDC に流動性供給できるようにするには？ --> 14 アカウントあれば足りる (おもったより少ない数でいける)
    const lower_index = PriceMath.priceToTickIndex(new Decimal(1), SOL.decimals, USDC.decimals);
    const upper_index = PriceMath.priceToTickIndex(new Decimal(2000), SOL.decimals, USDC.decimals);

    console.log("tick range (1 - 2000USDC/SOL):", lower_index, upper_index);
    const tick_per_array_account = 88 * tick_spacing;
    console.log("required account num:", (upper_index - lower_index) / tick_per_array_account);

    // lower_index, upper_index を包含できる tick array を構成する
    const tick_array = [];
    let offset = 0;
    while ( true ) {
        // 1 アカウントに 88 index 入るため tick_spacing * 88 ずつずれる (tick_spacing = 64 なら 5632 ずつずれる)
        let start_index = TickUtil.getStartTickIndex(lower_index, tick_spacing, offset);
        // tick array の PDA を導出したうえで IX を構成
        let pda = PDAUtil.getTickArrayFromTickIndex(lower_index, tick_spacing, whirlpool_pda.publicKey, ORCA_WHIRLPOOL_PROGRAM_ID, offset);
        let ix = WhirlpoolIx.initTickArrayIx(ctx.program, {
            funder: ctx.wallet.publicKey,
            startTick: start_index,
            tickArrayPda: pda,
            whirlpool: whirlpool_pda.publicKey,
        });
        if ( start_index > upper_index ) break;
        tick_array.push({start_index, pda, ix});
        offset++;
    }
    console.log("tick_array", tick_array);

    // 10 IX を 1 TX に入れることができるので分割
    const MAX_IX_NUM = 10;
    const ix_chunks: Instruction[][] = [];
    for ( let i=0; i<tick_array.length; i += MAX_IX_NUM ) {
        ix_chunks.push(tick_array.slice(i, i+MAX_IX_NUM).map((t) => t.ix));
    }

    // TX 実行
    console.log(ix_chunks);
    for ( let i=0; i<ix_chunks.length; i++ ) {
        const ix_chunk = ix_chunks[i];

        const tx = new TransactionBuilder(ctx.provider);
        ix_chunk.map((ix) => tx.addInstruction(ix));

        const signature = await tx.buildAndExecute();
        console.log("signature", signature);
        await ctx.connection.confirmTransaction(signature, "confirmed");
    }
    
    // 結果確認
    // 現在のtickからプラス方向で確認
    for ( let i=0; i<20; i++ ) {
        const tick_index = TickUtil.getStartTickIndex(whirlpool_data.tickCurrentIndex, tick_spacing, +1 * i);
        const price = PriceMath.tickIndexToPrice(tick_index, SOL.decimals, USDC.decimals);
        const pda = PDAUtil.getTickArrayFromTickIndex(tick_index, tick_spacing, whirlpool_pda.publicKey, ORCA_WHIRLPOOL_PROGRAM_ID);
        const tick_array = await fetcher.getTickArray(pda.publicKey);
        console.log(i, tick_index, price.toString(), tick_array === null ? "NOT initialized" : "initialized");
        if ( tick_array === null ) break;
    }

    // 現在のtickからマイナス方向で確認
    for ( let i=0; i<20; i++ ) {
        const tick_index = TickUtil.getStartTickIndex(whirlpool_data.tickCurrentIndex, tick_spacing, -1 * i);
        const price = PriceMath.tickIndexToPrice(tick_index, SOL.decimals, USDC.decimals);
        const pda = PDAUtil.getTickArrayFromTickIndex(tick_index, tick_spacing, whirlpool_pda.publicKey, ORCA_WHIRLPOOL_PROGRAM_ID);
        const tick_array = await fetcher.getTickArray(pda.publicKey);
        console.log(i, tick_index, price.toString(), tick_array === null ? "NOT initialized" : "initialized");
        if ( tick_array === null ) break;
    }

}

main();

/*
SAMPLE OUTPUT:

$ ts-node src/3_init_tickarray.ts 
connection endpoint https://api.devnet.solana.com
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
ORCA_WHIRLPOOL_PROGRAM_ID whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc
ORCA_WHIRLPOOLS_CONFIG 847gd7SckNwJetbjf22ktip9vAtKWPMY4ntdr6CdCsJj
whirlpool_pda.publicKey 6b9pYMwUPHBRLLtwQrSjpnqzjDcwByupqgaqqzvUMWoi
feeGrowthGlobalA 0
feeGrowthGlobalB 0
feeRate 2000 = 0.200 %
liquidity 0
protocolFeeOwedA 0
protocolFeeOwedB 0
protocolFeeRate 300 = 3.000 %
protocolFeeRate x feeRate 0.006 %
rewardInfos
  reward.mint 11111111111111111111111111111111
    vault 11111111111111111111111111111111
    authority 81dVYq6RgX6Jt1TEDWpLkYUMWesNq3GMSYLKaKsopUqi
    emissionsPerSecondX64 0
    growthGlobalX64 0
  reward.mint 11111111111111111111111111111111
    vault 11111111111111111111111111111111
    authority 81dVYq6RgX6Jt1TEDWpLkYUMWesNq3GMSYLKaKsopUqi
    emissionsPerSecondX64 0
    growthGlobalX64 0
  reward.mint 11111111111111111111111111111111
    vault 11111111111111111111111111111111
    authority 81dVYq6RgX6Jt1TEDWpLkYUMWesNq3GMSYLKaKsopUqi
    emissionsPerSecondX64 0
    growthGlobalX64 0
rewardLastUpdatedTimestamp 0
sqrtPrice 5833372668713515884
price 99.99999999999999997058490308202739623789
tickCurrentIndex -23028
tickSpacing 64
tokenMintA So11111111111111111111111111111111111111112
tokenMintB AbixiHWAh6W7rtj7jKqV4Lt73kZWy5usanioVZjvPoqe
tokenVaultA AGwn1FR4cW5YkZCnm7WVsirEcmtWfpHvF7twZFmTnvK8
tokenVaultB GbM6Dat7UuTQuuUY9cZBKfsbG8AE6Lw2KXYoKdb7C9o2
whirlpoolBump [ 255 ]
whirlpoolsConfig 847gd7SckNwJetbjf22ktip9vAtKWPMY4ntdr6CdCsJj
tickIndex for 100USDC/SOL -23028
tickIndex for 1000USDC/SOL 0
tick range (1 - 2000USDC/SOL): -69082 6931
required account num: 13.496626420454545
tick_array [
  {
    start_index: -73216,
    pda: { publicKey: [PublicKey], bump: 253 },
    ix: { instructions: [Array], cleanupInstructions: [], signers: [] }
  },
  {
    start_index: -67584,
    pda: { publicKey: [PublicKey], bump: 255 },
    ix: { instructions: [Array], cleanupInstructions: [], signers: [] }
  },
  {
    start_index: -61952,
    pda: { publicKey: [PublicKey], bump: 254 },
    ix: { instructions: [Array], cleanupInstructions: [], signers: [] }
  },
  {
    start_index: -56320,
    pda: { publicKey: [PublicKey], bump: 254 },
    ix: { instructions: [Array], cleanupInstructions: [], signers: [] }
  },
  {
    start_index: -50688,
    pda: { publicKey: [PublicKey], bump: 252 },
    ix: { instructions: [Array], cleanupInstructions: [], signers: [] }
  },
  {
    start_index: -45056,
    pda: { publicKey: [PublicKey], bump: 251 },
    ix: { instructions: [Array], cleanupInstructions: [], signers: [] }
  },
  {
    start_index: -39424,
    pda: { publicKey: [PublicKey], bump: 254 },
    ix: { instructions: [Array], cleanupInstructions: [], signers: [] }
  },
  {
    start_index: -33792,
    pda: { publicKey: [PublicKey], bump: 255 },
    ix: { instructions: [Array], cleanupInstructions: [], signers: [] }
  },
  {
    start_index: -28160,
    pda: { publicKey: [PublicKey], bump: 255 },
    ix: { instructions: [Array], cleanupInstructions: [], signers: [] }
  },
  {
    start_index: -22528,
    pda: { publicKey: [PublicKey], bump: 254 },
    ix: { instructions: [Array], cleanupInstructions: [], signers: [] }
  },
  {
    start_index: -16896,
    pda: { publicKey: [PublicKey], bump: 255 },
    ix: { instructions: [Array], cleanupInstructions: [], signers: [] }
  },
  {
    start_index: -11264,
    pda: { publicKey: [PublicKey], bump: 255 },
    ix: { instructions: [Array], cleanupInstructions: [], signers: [] }
  },
  {
    start_index: -5632,
    pda: { publicKey: [PublicKey], bump: 255 },
    ix: { instructions: [Array], cleanupInstructions: [], signers: [] }
  },
  {
    start_index: 0,
    pda: { publicKey: [PublicKey], bump: 254 },
    ix: { instructions: [Array], cleanupInstructions: [], signers: [] }
  },
  {
    start_index: 5632,
    pda: { publicKey: [PublicKey], bump: 254 },
    ix: { instructions: [Array], cleanupInstructions: [], signers: [] }
  }
]
[
  [
    { instructions: [Array], cleanupInstructions: [], signers: [] },
    { instructions: [Array], cleanupInstructions: [], signers: [] },
    { instructions: [Array], cleanupInstructions: [], signers: [] },
    { instructions: [Array], cleanupInstructions: [], signers: [] },
    { instructions: [Array], cleanupInstructions: [], signers: [] },
    { instructions: [Array], cleanupInstructions: [], signers: [] },
    { instructions: [Array], cleanupInstructions: [], signers: [] },
    { instructions: [Array], cleanupInstructions: [], signers: [] },
    { instructions: [Array], cleanupInstructions: [], signers: [] },
    { instructions: [Array], cleanupInstructions: [], signers: [] }
  ],
  [
    { instructions: [Array], cleanupInstructions: [], signers: [] },
    { instructions: [Array], cleanupInstructions: [], signers: [] },
    { instructions: [Array], cleanupInstructions: [], signers: [] },
    { instructions: [Array], cleanupInstructions: [], signers: [] },
    { instructions: [Array], cleanupInstructions: [], signers: [] }
  ]
]
signature 3ZjXujJny6oooH6syKLVctUGr5hEBrLZzzmd8yUU1jxVcTBnR6je8A5Ys1hFG4d7tXMPwiYYubrd7wsdSEK9vtEh
signature 5AXsGACfAmaTpfowwTK8rDSuNEjWrg3RF5WRh5jmvXQEMypjdLAsCh1E7c7pQ54aoLaw48D5Pg825YgAtfDeaC7d

0 -28160 59.85327014922842806585400827096887605148 initialized
1 -22528 105.1163583632798830319536333453303035968 initialized
2 -16896 184.6089406311230545790196446655563711948 initialized
3 -11264 324.2165300586629296661527942379993013326 initialized
4 -5632 569.4001493314371529133468673006593367877 initialized
5 0 999.9999999999999999999999999999999999996 initialized
6 5632 1756.234172355158174953548123531343698145 initialized
7 11264 3084.358468148007431168696145694825063843 NOT initialized
0 -28160 59.85327014922842806585400827096887605148 initialized
1 -33792 34.08046096094551663827231008385747870791 initialized
2 -39424 19.4054195604465913059152843617086095307 initialized
3 -45056 11.04944879555748060875096430328425229868 initialized
4 -50688 6.291557794220497848214548764740233387578 initialized
5 -56320 3.582413947556518812399693855129498090331 initialized
6 -61952 2.039827036705705078376238972290656649745 initialized
7 -67584 1.1614778193105314048737908442079757097 initialized
8 -73216 0.6613456437605685607237673233974218867926 initialized
9 -78848 0.3765703083169631764768163590746725773544 NOT initialized
*/