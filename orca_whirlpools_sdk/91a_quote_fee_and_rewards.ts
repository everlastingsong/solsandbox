import { PublicKey } from "@solana/web3.js";
import { Provider } from "@project-serum/anchor";
import {
  WhirlpoolContext, AccountFetcher, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID,
  collectFeesQuote, collectRewardsQuote, TickArrayUtil, PDAUtil, PoolUtil,
} from "@orca-so/whirlpools-sdk";

// bash$ export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ export WHIRLPOOL_POSITION=6v6yBniYtTdY3PfBu6pbSzHKSymXgoYoshG91mryzxZx
// bash$ ts-node this_script.ts


async function main() {
  const provider = Provider.env();
  const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
  const fetcher = new AccountFetcher(ctx.connection);
  const client = buildWhirlpoolClient(ctx, fetcher);

  console.log("endpoint:", ctx.connection.rpcEndpoint);
  console.log("wallet pubkey:", ctx.wallet.publicKey.toBase58());

  // POSITION
  const position_address = process.env.WHIRLPOOL_POSITION;
  const position_pubkey = new PublicKey(position_address);
  console.log("position address:", position_pubkey.toBase58());

  const position = await client.getPosition(position_pubkey);
  const whirlpool_pubkey = position.getData().whirlpool;
  const whirlpool = await client.getPool(whirlpool_pubkey);
  const tick_spacing = whirlpool.getData().tickSpacing;
  const tick_array_lower_pubkey = PDAUtil.getTickArrayFromTickIndex(position.getData().tickLowerIndex, tick_spacing, whirlpool_pubkey, ctx.program.programId).publicKey;
  const tick_array_upper_pubkey = PDAUtil.getTickArrayFromTickIndex(position.getData().tickUpperIndex, tick_spacing, whirlpool_pubkey, ctx.program.programId).publicKey;
  const tick_array_lower = await fetcher.getTickArray(tick_array_lower_pubkey);
  const tick_array_upper = await fetcher.getTickArray(tick_array_upper_pubkey);
  const tick_lower = TickArrayUtil.getTickFromArray(tick_array_lower, position.getData().tickLowerIndex, tick_spacing);
  const tick_upper = TickArrayUtil.getTickFromArray(tick_array_upper, position.getData().tickUpperIndex, tick_spacing);

  /*
  // for pool with a few TX

  const update_ix = WhirlpoolIx.updateFeesAndRewardsIx(ctx.program, {
    whirlpool: whirlpool_pubkey,
    position: position_pubkey,
    tickArrayLower: tick_array_lower_pubkey,
    tickArrayUpper: tick_array_upper_pubkey,
  });
  const update_signature = await toTx(ctx, update_ix).buildAndExecute();
  console.log("update_signature:", update_signature);
  await ctx.connection.confirmTransaction(update_signature, "confirmed");

  await whirlpool.refreshData();
  */

  // fee
  const quote_fee = await collectFeesQuote({
    whirlpool: whirlpool.getData(),
    position: position.getData(),
    tickLower: tick_lower,
    tickUpper: tick_upper,
  });

  // reward
  const quote_reward = await collectRewardsQuote({
    whirlpool: whirlpool.getData(),
    position: position.getData(),
    tickLower: tick_lower,
    tickUpper: tick_upper,
  });

  console.log("fee tokenA:", quote_fee.feeOwedA.toString());
  console.log("fee tokenB:", quote_fee.feeOwedB.toString());

  quote_reward.map((reward, i) => {
    const reward_info = whirlpool.getData().rewardInfos[i];

    if ( PoolUtil.isRewardInitialized(reward_info) ) {
      console.log(`reward[${i}]:`, reward.toString(), reward_info.mint.toBase58());
    }
    else {
      console.log(`reward[${i}]: NOT INITIALIZED`);
    }
  }); 
}

main();

/*
SAMPLE OUTPUT:

$ ts-node src/91a_quote_fee_and_rewards.ts 
endpoint: https://api.devnet.solana.com
wallet pubkey: r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
position address: 6v6yBniYtTdY3PfBu6pbSzHKSymXgoYoshG91mryzxZx
fee tokenA: 26811737
fee tokenB: 263
reward[0]: 1499572 Afn8YB1p4NsoZeS5XJBZ18LTfEy5NFPwN46wapZcBQr6
reward[1]: 14995425 Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa
reward[2]: NOT INITIALIZED

*/