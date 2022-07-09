import {
    WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PDAUtil, ORCA_WHIRLPOOLS_CONFIG
} from "@orca-so/whirlpools-sdk";
import { Provider } from "@project-serum/anchor";

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

    console.log("ORCA_WHIRLPOOL_PROGRAM_ID", ORCA_WHIRLPOOL_PROGRAM_ID.toBase58());

    const checked_whirlpools_config = ORCA_WHIRLPOOLS_CONFIG;
    const checked_tick_spacing = [1, 8, 16, 32, 64, 128];
    for (let i=0; i<checked_tick_spacing.length; i++) {
      const tick_spacing = checked_tick_spacing[i];
      const feetier_pubkey = PDAUtil.getFeeTier(ctx.program.programId, checked_whirlpools_config, tick_spacing).publicKey;
      const feetier_data = await fetcher.getFeeTier(feetier_pubkey);
      const initialized = feetier_data !== null;

      console.log(`Fee Tier for ${tick_spacing} pubkey: ${feetier_pubkey.toBase58()}, initialized: ${initialized}`);
    }
}

main();

/*
SAMPLE OUTPUT:

$ ts-node 97b_check_initialized_fee_tier.ts 
connection endpoint https://ssc-dao.genesysgo.net
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
ORCA_WHIRLPOOL_PROGRAM_ID whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc
Fee Tier for 1 pubkey: 62dSkn5ktwY1PoKPNMArZA4bZsvyemuknWUnnQ2ATTuN, initialized: true
Fee Tier for 8 pubkey: GBtp54LJqqDSWonLT878KWerkJAYqYq4jasZ1UYs8wfD, initialized: false
Fee Tier for 16 pubkey: 87u3YRwJDNR2wozMTF3umYRgny8UMZ2mHN3UBTSXm8Ho, initialized: false
Fee Tier for 32 pubkey: 5MAqvbUmpXbhNCqV6gCRT3TWyt2fGTJyudhhfRdQbusA, initialized: false
Fee Tier for 64 pubkey: HT55NVGVTjWmWLjV7BrSMPVZ7ppU8T2xE5nCAZ6YaGad, initialized: true
Fee Tier for 128 pubkey: BGnhGXT9CCt5WYS23zg9sqsAT2MGXkq7VSwch9pML82W, initialized: false

*/
