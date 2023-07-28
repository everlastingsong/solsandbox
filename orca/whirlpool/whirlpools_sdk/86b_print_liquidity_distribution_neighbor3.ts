import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import {
    WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PDAUtil, PriceMath, TickUtil, TICK_ARRAY_SIZE, IGNORE_CACHE
} from "@orca-so/whirlpools-sdk";
import { Wallet, BN } from "@coral-xyz/anchor";

async function main() {
  const RPC_ENDPOINT_URL = process.env["RPC_ENDPOINT_URL"];
  if (!RPC_ENDPOINT_URL) {
    console.log("Please set RPC_ENDPOINT_URL");
    return;
  }

  const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");
  const dummy_wallet = new Wallet(Keypair.generate());
  const ctx = WhirlpoolContext.from(connection, dummy_wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const client = buildWhirlpoolClient(ctx);

  // list: https://everlastingsong.github.io/account-microscope/#/whirlpool/list
  // HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ is one of the most well-known whirlpools, SOL/USDC with tickSpacing 64
  const whirlpool_key = new PublicKey("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ");

  const whirlpool = await client.getPool(whirlpool_key);

  const token_a = whirlpool.getTokenAInfo();
  const token_b = whirlpool.getTokenBInfo();
  const whirlpool_data = whirlpool.getData();
  const tick_spacing = whirlpool_data.tickSpacing;

  // get tickarray pubkeys
  // -3 to +3 tickarrays
  const TICKARRAY_LOWER_OFFSET = -3;
  const TICKARRAY_UPPER_OFFSET = +3;
  const tickarray_start_indexes: number[] = [];
  const tickarray_pubkeys: PublicKey[] = [];
  for ( let offset=TICKARRAY_LOWER_OFFSET; offset<=TICKARRAY_UPPER_OFFSET; offset++ ) {
    const start_tick_index = TickUtil.getStartTickIndex(whirlpool_data.tickCurrentIndex, tick_spacing, offset);
    const pda = PDAUtil.getTickArrayFromTickIndex(start_tick_index, tick_spacing, whirlpool_key, ORCA_WHIRLPOOL_PROGRAM_ID);
    tickarray_start_indexes.push(start_tick_index);
    tickarray_pubkeys.push(pda.publicKey);
  }

  // get tickarrays
  const tickarrays = await ctx.fetcher.getTickArrays(tickarray_pubkeys, IGNORE_CACHE);

  // sweep liquidity
  const current_initializable_tick_index = Math.floor(whirlpool_data.tickCurrentIndex / tick_spacing) * tick_spacing;
  const current_pool_liquidity = whirlpool_data.liquidity;
  const liquidity_distribution = [];
  let liquidity = new BN(0);
  let liquidity_difference;
  for ( let ta=0; ta<tickarrays.length; ta++ ) {
    const tickarray = tickarrays[ta];

    for ( let i=0; i<TICK_ARRAY_SIZE; i++ ) {
      const tick_index = tickarray_start_indexes[ta] + i*tick_spacing;

      // move right (add liquidityNet)
      liquidity = tickarray == null ? liquidity : liquidity.add(tickarray.ticks[i].liquidityNet);

      liquidity_distribution.push({tick_index, liquidity});

      // difference due to liquidity in TickArrays not read
      if ( tick_index === current_initializable_tick_index ) {
        liquidity_difference = current_pool_liquidity.sub(liquidity);
      }
    }
  }

  // adjust (liquidity in TickArray not read)
  for ( let i=0; i<liquidity_distribution.length; i++ ) {
    liquidity_distribution[i].liquidity = liquidity_distribution[i].liquidity.add(liquidity_difference);
  }

  // print liquidity distribution
  for ( let i=0; i<liquidity_distribution.length; i++ ) {
    const L = liquidity_distribution[i];
    console.log(
      "tick_index:", L.tick_index.toString().padStart(6, " "),
      "/ price:", PriceMath.tickIndexToPrice(L.tick_index, token_a.decimals, token_b.decimals).toFixed(token_b.decimals).toString().padStart(11, " "),
      "/ liquidity:", L.liquidity.toString().padStart(20, " "),
      L.tick_index === current_initializable_tick_index ? " <== CURRENT" : ""
    );
  }

  console.log("current pool liquidity:", current_pool_liquidity.toString());
  console.log("current index:", whirlpool_data.tickCurrentIndex);
  console.log("current initializable tick index:", current_initializable_tick_index);
  console.log("liquidity difference (liquidity in TickArray not read):", liquidity_difference.toString());
}

main();

/*

SAMPLE OUTPUT(SOL/USDC):

$ ts-node 86b_print_liquidity_distribution_neighbor3.ts 
tick_index: -56320 / price:    3.582413 / liquidity:         470082663185 
tick_index: -56256 / price:    3.605413 / liquidity:         470082663185 
tick_index: -56192 / price:    3.628561 / liquidity:         470082663185 
tick_index: -56128 / price:    3.651857 / liquidity:         470082663185 
tick_index: -56064 / price:    3.675303 / liquidity:         470082663185 
tick_index: -56000 / price:    3.698899 / liquidity:         470082663185 
tick_index: -55936 / price:    3.722646 / liquidity:         470082663185 
tick_index: -55872 / price:    3.746547 / liquidity:         470082663185 
tick_index: -55808 / price:    3.770600 / liquidity:         470082663185 
tick_index: -55744 / price:    3.794808 / liquidity:         470082663185 
tick_index: -55680 / price:    3.819172 / liquidity:         470082663185 
tick_index: -55616 / price:    3.843691 / liquidity:         470082663185 
tick_index: -55552 / price:    3.868369 / liquidity:         470082663185 
tick_index: -55488 / price:    3.893204 / liquidity:         470082663185 
tick_index: -55424 / price:    3.918200 / liquidity:         470082663185 
tick_index: -55360 / price:    3.943355 / liquidity:         470082663185 
tick_index: -55296 / price:    3.968672 / liquidity:         470082663185 
tick_index: -55232 / price:    3.994152 / liquidity:         470082663185 
tick_index: -55168 / price:    4.019795 / liquidity:         470082663185 
tick_index: -55104 / price:    4.045603 / liquidity:         470082663185 
tick_index: -55040 / price:    4.071577 / liquidity:         470082663185 
tick_index: -54976 / price:    4.097717 / liquidity:         470082663185 
tick_index: -54912 / price:    4.124025 / liquidity:         470082663185 
tick_index: -54848 / price:    4.150502 / liquidity:         470082663185 
tick_index: -54784 / price:    4.177149 / liquidity:         470082663185 
tick_index: -54720 / price:    4.203968 / liquidity:         470082663185 
tick_index: -54656 / price:    4.230958 / liquidity:         470082663185 
tick_index: -54592 / price:    4.258122 / liquidity:         470082663185 
tick_index: -54528 / price:    4.285460 / liquidity:         470082663185 
tick_index: -54464 / price:    4.312973 / liquidity:         470082663185 
tick_index: -54400 / price:    4.340663 / liquidity:         470082663185 
tick_index: -54336 / price:    4.368531 / liquidity:         470082663185 
tick_index: -54272 / price:    4.396578 / liquidity:         470082663185 
tick_index: -54208 / price:    4.424805 / liquidity:         470082663185 
tick_index: -54144 / price:    4.453213 / liquidity:         470082663185 
tick_index: -54080 / price:    4.481804 / liquidity:         470082663185 
tick_index: -54016 / price:    4.510578 / liquidity:         470082663185 
tick_index: -53952 / price:    4.539536 / liquidity:         470082663185 
tick_index: -53888 / price:    4.568681 / liquidity:         470082663185 
tick_index: -53824 / price:    4.598013 / liquidity:         470082663185 
tick_index: -53760 / price:    4.627533 / liquidity:         470082663185 
tick_index: -53696 / price:    4.657243 / liquidity:         470082663185 
tick_index: -53632 / price:    4.687143 / liquidity:         470082663185 
tick_index: -53568 / price:    4.717236 / liquidity:         470082663185 
tick_index: -53504 / price:    4.747521 / liquidity:         470082663185 
tick_index: -53440 / price:    4.778001 / liquidity:         470082663185 
tick_index: -53376 / price:    4.808677 / liquidity:         470082663185 
tick_index: -53312 / price:    4.839550 / liquidity:         470082663185 
tick_index: -53248 / price:    4.870621 / liquidity:         470082663185 
tick_index: -53184 / price:    4.901891 / liquidity:         470082663185 
tick_index: -53120 / price:    4.933362 / liquidity:         470082663185 
tick_index: -53056 / price:    4.965035 / liquidity:         470082663185 
tick_index: -52992 / price:    4.996912 / liquidity:         470082663185 
tick_index: -52928 / price:    5.028993 / liquidity:         869519754658 
tick_index: -52864 / price:    5.061280 / liquidity:         869519754658 
tick_index: -52800 / price:    5.093775 / liquidity:         869519754658 
tick_index: -52736 / price:    5.126478 / liquidity:         869519754658 
tick_index: -52672 / price:    5.159391 / liquidity:         869519754658 
tick_index: -52608 / price:    5.192515 / liquidity:         869519754658 
tick_index: -52544 / price:    5.225852 / liquidity:         869519754658 
tick_index: -52480 / price:    5.259403 / liquidity:         869519754658 
tick_index: -52416 / price:    5.293170 / liquidity:         869519754658 
tick_index: -52352 / price:    5.327153 / liquidity:         869519754658 
tick_index: -52288 / price:    5.361354 / liquidity:         869519754658 
tick_index: -52224 / price:    5.395775 / liquidity:         869519754658 
tick_index: -52160 / price:    5.430417 / liquidity:         869519754658 
tick_index: -52096 / price:    5.465282 / liquidity:         869519754658 
tick_index: -52032 / price:    5.500370 / liquidity:         869519754658 
tick_index: -51968 / price:    5.535683 / liquidity:         869519754658 
tick_index: -51904 / price:    5.571224 / liquidity:         869519754658 
tick_index: -51840 / price:    5.606992 / liquidity:         869519754658 
tick_index: -51776 / price:    5.642990 / liquidity:         869519754658 
tick_index: -51712 / price:    5.679219 / liquidity:         869519754658 
tick_index: -51648 / price:    5.715681 / liquidity:         869519754658 
tick_index: -51584 / price:    5.752377 / liquidity:         869519754658 
tick_index: -51520 / price:    5.789308 / liquidity:         869519754658 
tick_index: -51456 / price:    5.826477 / liquidity:         869519754658 
tick_index: -51392 / price:    5.863884 / liquidity:         869519754658 
tick_index: -51328 / price:    5.901531 / liquidity:         869519754658 
tick_index: -51264 / price:    5.939420 / liquidity:         869519754658 
tick_index: -51200 / price:    5.977552 / liquidity:         869519754658 
tick_index: -51136 / price:    6.015929 / liquidity:         869519754658 
tick_index: -51072 / price:    6.054553 / liquidity:         869519754658 
tick_index: -51008 / price:    6.093424 / liquidity:         869519754658 
tick_index: -50944 / price:    6.132545 / liquidity:         869519754658 
tick_index: -50880 / price:    6.171918 / liquidity:         869519754658 
tick_index: -50816 / price:    6.211543 / liquidity:         869519754658 
tick_index: -50752 / price:    6.251422 / liquidity:         869519754658 
tick_index: -50688 / price:    6.291557 / liquidity:         869519754658 
tick_index: -50624 / price:    6.331950 / liquidity:         869519754658 
tick_index: -50560 / price:    6.372603 / liquidity:         875376272922 
tick_index: -50496 / price:    6.413516 / liquidity:         875376272922 
tick_index: -50432 / price:    6.454692 / liquidity:         875376272922 
tick_index: -50368 / price:    6.496133 / liquidity:         875376272922 
tick_index: -50304 / price:    6.537839 / liquidity:         875376272922 
tick_index: -50240 / price:    6.579813 / liquidity:         875376272922 
tick_index: -50176 / price:    6.622057 / liquidity:         875376272922 
tick_index: -50112 / price:    6.664572 / liquidity:         875376272922 
tick_index: -50048 / price:    6.707360 / liquidity:         875376272922 
tick_index: -49984 / price:    6.750423 / liquidity:         875376272922 
tick_index: -49920 / price:    6.793762 / liquidity:         875376272922 
tick_index: -49856 / price:    6.837379 / liquidity:         875376272922 
tick_index: -49792 / price:    6.881276 / liquidity:        1159215230798 
tick_index: -49728 / price:    6.925456 / liquidity:        1159215230798 
tick_index: -49664 / price:    6.969918 / liquidity:        1159215230798 
tick_index: -49600 / price:    7.014667 / liquidity:        1195460944011 
tick_index: -49536 / price:    7.059702 / liquidity:        1195460944011 
tick_index: -49472 / price:    7.105027 / liquidity:        1195460944011 
tick_index: -49408 / price:    7.150643 / liquidity:        1195460944011 
tick_index: -49344 / price:    7.196551 / liquidity:        1195460944011 
tick_index: -49280 / price:    7.242755 / liquidity:        1195460944011 
tick_index: -49216 / price:    7.289254 / liquidity:        1195460944011 
tick_index: -49152 / price:    7.336053 / liquidity:        1195460944011 
tick_index: -49088 / price:    7.383152 / liquidity:        1195460944011 
tick_index: -49024 / price:    7.430553 / liquidity:        1195460944011 
tick_index: -48960 / price:    7.478259 / liquidity:        1195460944011 
tick_index: -48896 / price:    7.526271 / liquidity:        1195460944011 
tick_index: -48832 / price:    7.574591 / liquidity:        1195460944011 
tick_index: -48768 / price:    7.623221 / liquidity:        1195460944011 
tick_index: -48704 / price:    7.672164 / liquidity:        1195460944011 
tick_index: -48640 / price:    7.721421 / liquidity:        1195461160912 
tick_index: -48576 / price:    7.770994 / liquidity:        1195461160912 
tick_index: -48512 / price:    7.820885 / liquidity:        1197018342849 
tick_index: -48448 / price:    7.871097 / liquidity:        1197018342849 
tick_index: -48384 / price:    7.921631 / liquidity:        1197018342849 
tick_index: -48320 / price:    7.972489 / liquidity:        1197018342849 
tick_index: -48256 / price:    8.023674 / liquidity:        1242305492635 
tick_index: -48192 / price:    8.075188 / liquidity:        1242305492635 
tick_index: -48128 / price:    8.127032 / liquidity:        1242896182199 
tick_index: -48064 / price:    8.179210 / liquidity:        1242896182199 
tick_index: -48000 / price:    8.231722 / liquidity:        1244071088351 
tick_index: -47936 / price:    8.284571 / liquidity:        1244071088351 
tick_index: -47872 / price:    8.337760 / liquidity:        1244071088351 
tick_index: -47808 / price:    8.391290 / liquidity:        1244071088351 
tick_index: -47744 / price:    8.445164 / liquidity:        1244071088351 
tick_index: -47680 / price:    8.499383 / liquidity:        1244071088351 
tick_index: -47616 / price:    8.553951 / liquidity:        1244071088351 
tick_index: -47552 / price:    8.608869 / liquidity:        1244071088351 
tick_index: -47488 / price:    8.664140 / liquidity:        1244097490752 
tick_index: -47424 / price:    8.719765 / liquidity:        1244097490752 
tick_index: -47360 / price:    8.775748 / liquidity:        1248015645823 
tick_index: -47296 / price:    8.832090 / liquidity:        1248015645823 
tick_index: -47232 / price:    8.888794 / liquidity:        1248015645823 
tick_index: -47168 / price:    8.945862 / liquidity:        1248015645823 
tick_index: -47104 / price:    9.003296 / liquidity:        1249102367574 
tick_index: -47040 / price:    9.061099 / liquidity:        1249102367574 
tick_index: -46976 / price:    9.119273 / liquidity:        1258369728258 
tick_index: -46912 / price:    9.177821 / liquidity:        1258369728258 
tick_index: -46848 / price:    9.236744 / liquidity:        1261235192743 
tick_index: -46784 / price:    9.296046 / liquidity:        1261235192743 
tick_index: -46720 / price:    9.355728 / liquidity:        1261235192743 
tick_index: -46656 / price:    9.415794 / liquidity:        1306468612860 
tick_index: -46592 / price:    9.476245 / liquidity:        1306468612860 
tick_index: -46528 / price:    9.537085 / liquidity:        1306468612860 
tick_index: -46464 / price:    9.598315 / liquidity:        1306468612860 
tick_index: -46400 / price:    9.659938 / liquidity:        1306468612860 
tick_index: -46336 / price:    9.721957 / liquidity:        1306468612860 
tick_index: -46272 / price:    9.784374 / liquidity:        1306468612860 
tick_index: -46208 / price:    9.847191 / liquidity:        1306468612860 
tick_index: -46144 / price:    9.910412 / liquidity:        1306468612860 
tick_index: -46080 / price:    9.974039 / liquidity:        1306468612860 
tick_index: -46016 / price:   10.038074 / liquidity:        2102178592725 
tick_index: -45952 / price:   10.102521 / liquidity:        2102152190324 
tick_index: -45888 / price:   10.167381 / liquidity:        2102152190324 
tick_index: -45824 / price:   10.232658 / liquidity:        2102152190324 
tick_index: -45760 / price:   10.298353 / liquidity:        2102152190324 
tick_index: -45696 / price:   10.364471 / liquidity:        2102355693024 
tick_index: -45632 / price:   10.431013 / liquidity:        2102355693024 
tick_index: -45568 / price:   10.497982 / liquidity:        2102355693024 
tick_index: -45504 / price:   10.565381 / liquidity:        2143095749818 
tick_index: -45440 / price:   10.633213 / liquidity:        2143095749818 
tick_index: -45376 / price:   10.701481 / liquidity:        2143095749818 
tick_index: -45312 / price:   10.770186 / liquidity:        2143095749818 
tick_index: -45248 / price:   10.839333 / liquidity:        2146847237980 
tick_index: -45184 / price:   10.908924 / liquidity:        2146847237980 
tick_index: -45120 / price:   10.978961 / liquidity:        2146847237980 
tick_index: -45056 / price:   11.049448 / liquidity:        2146643779644 
tick_index: -44992 / price:   11.120388 / liquidity:        2146643779644 
tick_index: -44928 / price:   11.191783 / liquidity:        2146644613260 
tick_index: -44864 / price:   11.263637 / liquidity:        2146644613260 
tick_index: -44800 / price:   11.335951 / liquidity:        2146647241820 
tick_index: -44736 / price:   11.408731 / liquidity:        2146979069546 
tick_index: -44672 / price:   11.481977 / liquidity:        2158439427069 
tick_index: -44608 / price:   11.555694 / liquidity:        2158439427069 
tick_index: -44544 / price:   11.629883 / liquidity:        2158439427069 
tick_index: -44480 / price:   11.704550 / liquidity:        2171376036949 
tick_index: -44416 / price:   11.779695 / liquidity:        2173948128334 
tick_index: -44352 / price:   11.855323 / liquidity:        2173948128334 
tick_index: -44288 / price:   11.931437 / liquidity:        2173948128334 
tick_index: -44224 / price:   12.008039 / liquidity:        2176480783731 
tick_index: -44160 / price:   12.085133 / liquidity:        2176480783731 
tick_index: -44096 / price:   12.162722 / liquidity:        2177876720810 
tick_index: -44032 / price:   12.240809 / liquidity:        2178634912443 
tick_index: -43968 / price:   12.319398 / liquidity:        2178634912443 
tick_index: -43904 / price:   12.398491 / liquidity:        2179553154715 
tick_index: -43840 / price:   12.478091 / liquidity:        2179553154715 
tick_index: -43776 / price:   12.558203 / liquidity:        2188267799784 
tick_index: -43712 / price:   12.638830 / liquidity:        2188267799784 
tick_index: -43648 / price:   12.719973 / liquidity:        2188267799784 
tick_index: -43584 / price:   12.801638 / liquidity:        2188270047427 
tick_index: -43520 / price:   12.883827 / liquidity:        2188271724528 
tick_index: -43456 / price:   12.966544 / liquidity:        2188275380448 
tick_index: -43392 / price:   13.049792 / liquidity:        2206708014313 
tick_index: -43328 / price:   13.133574 / liquidity:        2206708014313 
tick_index: -43264 / price:   13.217894 / liquidity:        2206708014313 
tick_index: -43200 / price:   13.302756 / liquidity:        2206854270718 
tick_index: -43136 / price:   13.388162 / liquidity:        2210013756613 
tick_index: -43072 / price:   13.474117 / liquidity:        2210182167480 
tick_index: -43008 / price:   13.560624 / liquidity:        2210182167480 
tick_index: -42944 / price:   13.647686 / liquidity:        2210182167480 
tick_index: -42880 / price:   13.735306 / liquidity:        2210182167480 
tick_index: -42816 / price:   13.823490 / liquidity:        2210182167480 
tick_index: -42752 / price:   13.912239 / liquidity:        2210182167480 
tick_index: -42688 / price:   14.001559 / liquidity:        2209206450437 
tick_index: -42624 / price:   14.091452 / liquidity:        2209206450437 
tick_index: -42560 / price:   14.181922 / liquidity:        2209206450437 
tick_index: -42496 / price:   14.272972 / liquidity:        2243056153102 
tick_index: -42432 / price:   14.364608 / liquidity:        2243053524661 
tick_index: -42368 / price:   14.456831 / liquidity:        2243053524661 
tick_index: -42304 / price:   14.549647 / liquidity:        2615145935769 
tick_index: -42240 / price:   14.643059 / liquidity:        2613962217919 
tick_index: -42176 / price:   14.737070 / liquidity:        2613962217919 
tick_index: -42112 / price:   14.831685 / liquidity:        2613962217919 
tick_index: -42048 / price:   14.926908 / liquidity:        2613966085496 
tick_index: -41984 / price:   15.022741 / liquidity:        2901014648403 
tick_index: -41920 / price:   15.119191 / liquidity:        2924931562268 
tick_index: -41856 / price:   15.216259 / liquidity:        2923598774170 
tick_index: -41792 / price:   15.313950 / liquidity:        2923784180760 
tick_index: -41728 / price:   15.412269 / liquidity:        2923784180760 
tick_index: -41664 / price:   15.511219 / liquidity:        2923624163564 
tick_index: -41600 / price:   15.610804 / liquidity:        2928908628588 
tick_index: -41536 / price:   15.711028 / liquidity:        2928146781035 
tick_index: -41472 / price:   15.811896 / liquidity:        2924228625964 
tick_index: -41408 / price:   15.913412 / liquidity:        2924208702815 
tick_index: -41344 / price:   16.015579 / liquidity:        2908411140629 
tick_index: -41280 / price:   16.118403 / liquidity:        2908411140629 
tick_index: -41216 / price:   16.221886 / liquidity:        2908411140629 
tick_index: -41152 / price:   16.326034 / liquidity:        2908793021809 
tick_index: -41088 / price:   16.430850 / liquidity:        2908793021809 
tick_index: -41024 / price:   16.536340 / liquidity:        2908793021809 
tick_index: -40960 / price:   16.642506 / liquidity:        2938973501570 
tick_index: -40896 / price:   16.749354 / liquidity:        2938974597692 
tick_index: -40832 / price:   16.856889 / liquidity:        2938974597692 
tick_index: -40768 / price:   16.965113 / liquidity:        2939662579688 
tick_index: -40704 / price:   17.074033 / liquidity:        2909574804984 
tick_index: -40640 / price:   17.183651 / liquidity:        2909574804984 
tick_index: -40576 / price:   17.293974 / liquidity:        2909574804984 
tick_index: -40512 / price:   17.405005 / liquidity:        2909574804984 
tick_index: -40448 / price:   17.516748 / liquidity:        2909574804984 
tick_index: -40384 / price:   17.629210 / liquidity:        2923510514083 
tick_index: -40320 / price:   17.742393 / liquidity:        2923287875400 
tick_index: -40256 / price:   17.856302 / liquidity:        2553622335335 
tick_index: -40192 / price:   17.970943 / liquidity:        2559311814687 
tick_index: -40128 / price:   18.086320 / liquidity:        2559467066019 
tick_index: -40064 / price:   18.202438 / liquidity:        2559469653115 
tick_index: -40000 / price:   18.319302 / liquidity:        2559469653115 
tick_index: -39936 / price:   18.436915 / liquidity:        2559469653115 
tick_index: -39872 / price:   18.555284 / liquidity:        2559831664810 
tick_index: -39808 / price:   18.674413 / liquidity:        2572976650661 
tick_index: -39744 / price:   18.794306 / liquidity:        2587272115550 
tick_index: -39680 / price:   18.914969 / liquidity:        2758007929106 
tick_index: -39616 / price:   19.036407 / liquidity:        3598543989669 
tick_index: -39552 / price:   19.158625 / liquidity:        3610643313732 
tick_index: -39488 / price:   19.281627 / liquidity:        3610798238445 
tick_index: -39424 / price:   19.405419 / liquidity:        3610798238445 
tick_index: -39360 / price:   19.530006 / liquidity:        3614593321588 
tick_index: -39296 / price:   19.655392 / liquidity:        3618189224530 
tick_index: -39232 / price:   19.781584 / liquidity:        3618189224530 
tick_index: -39168 / price:   19.908586 / liquidity:        4439509947459 
tick_index: -39104 / price:   20.036403 / liquidity:        3836156360300 
tick_index: -39040 / price:   20.165041 / liquidity:        3835168796380 
tick_index: -38976 / price:   20.294504 / liquidity:        3925524197120 
tick_index: -38912 / price:   20.424799 / liquidity:        4019841827674 
tick_index: -38848 / price:   20.555930 / liquidity:        4019841827674 
tick_index: -38784 / price:   20.687904 / liquidity:        4019841827674 
tick_index: -38720 / price:   20.820724 / liquidity:        4019841827674 
tick_index: -38656 / price:   20.954397 / liquidity:        4049012586188 
tick_index: -38592 / price:   21.088929 / liquidity:        4075427207957 
tick_index: -38528 / price:   21.224324 / liquidity:        4075427222730 
tick_index: -38464 / price:   21.360588 / liquidity:        4075427222730 
tick_index: -38400 / price:   21.497728 / liquidity:        4078546295479 
tick_index: -38336 / price:   21.635747 / liquidity:        4078740349674 
tick_index: -38272 / price:   21.774653 / liquidity:        6016713128311 
tick_index: -38208 / price:   21.914451 / liquidity:        6031359376098 
tick_index: -38144 / price:   22.055146 / liquidity:        6111990138764 
tick_index: -38080 / price:   22.196745 / liquidity:        6187313875523 
tick_index: -38016 / price:   22.339252 / liquidity:        6202472203425 
tick_index: -37952 / price:   22.482675 / liquidity:        6202965853968 
tick_index: -37888 / price:   22.627018 / liquidity:        6771586170950 
tick_index: -37824 / price:   22.772288 / liquidity:        6792715402270 
tick_index: -37760 / price:   22.918491 / liquidity:        6793376326586 
tick_index: -37696 / price:   23.065632 / liquidity:        6889641878276 
tick_index: -37632 / price:   23.213718 / liquidity:        7176497203922 
tick_index: -37568 / price:   23.362755 / liquidity:        7198965808092 
tick_index: -37504 / price:   23.512749 / liquidity:        7198992873925 
tick_index: -37440 / price:   23.663705 / liquidity:        7198992873925 
tick_index: -37376 / price:   23.815631 / liquidity:        7193537594305 
tick_index: -37312 / price:   23.968532 / liquidity:        7256119032293 
tick_index: -37248 / price:   24.122415 / liquidity:        7477607918314 
tick_index: -37184 / price:   24.277286 / liquidity:        7477607918314 
tick_index: -37120 / price:   24.433151 / liquidity:        7512388692814 
tick_index: -37056 / price:   24.590016 / liquidity:        7441932901091 
tick_index: -36992 / price:   24.747889 / liquidity:       11983716871385 
tick_index: -36928 / price:   24.906776 / liquidity:       11996129623306 
tick_index: -36864 / price:   25.066682 / liquidity:       13265161544075  <== CURRENT
tick_index: -36800 / price:   25.227615 / liquidity:       15699283185210 
tick_index: -36736 / price:   25.389582 / liquidity:       15696484701090 
tick_index: -36672 / price:   25.552588 / liquidity:       15699554137001 
tick_index: -36608 / price:   25.716641 / liquidity:       15703521911713 
tick_index: -36544 / price:   25.881747 / liquidity:       13283772932933 
tick_index: -36480 / price:   26.047913 / liquidity:       13047480259765 
tick_index: -36416 / price:   26.215146 / liquidity:       13025642753605 
tick_index: -36352 / price:   26.383452 / liquidity:       13025642753605 
tick_index: -36288 / price:   26.552839 / liquidity:       13027324596274 
tick_index: -36224 / price:   26.723314 / liquidity:       13012704877006 
tick_index: -36160 / price:   26.894883 / liquidity:       13020818511254 
tick_index: -36096 / price:   27.067554 / liquidity:       12743441496331 
tick_index: -36032 / price:   27.241333 / liquidity:       12743469820199 
tick_index: -35968 / price:   27.416228 / liquidity:       12741173409174 
tick_index: -35904 / price:   27.592245 / liquidity:       12790248434372 
tick_index: -35840 / price:   27.769393 / liquidity:       10852315169759 
tick_index: -35776 / price:   27.947678 / liquidity:       10830766994338 
tick_index: -35712 / price:   28.127108 / liquidity:       10821583557942 
tick_index: -35648 / price:   28.307690 / liquidity:       10793983640904 
tick_index: -35584 / price:   28.489431 / liquidity:       10716050583439 
tick_index: -35520 / price:   28.672339 / liquidity:       10643699112575 
tick_index: -35456 / price:   28.856421 / liquidity:       10654502612666 
tick_index: -35392 / price:   29.041685 / liquidity:       10648824865396 
tick_index: -35328 / price:   29.228138 / liquidity:       10354071102861 
tick_index: -35264 / price:   29.415789 / liquidity:       10245719513426 
tick_index: -35200 / price:   29.604644 / liquidity:       10262093305125 
tick_index: -35136 / price:   29.794712 / liquidity:       10306323334530 
tick_index: -35072 / price:   29.986000 / liquidity:        9605014753134 
tick_index: -35008 / price:   30.178516 / liquidity:        7884104326706 
tick_index: -34944 / price:   30.372268 / liquidity:        7884745802483 
tick_index: -34880 / price:   30.567265 / liquidity:        8320038775185 
tick_index: -34816 / price:   30.763513 / liquidity:        8540675302383 
tick_index: -34752 / price:   30.961021 / liquidity:        7393927682434 
tick_index: -34688 / price:   31.159797 / liquidity:        7951721362472 
tick_index: -34624 / price:   31.359849 / liquidity:        7950960736227 
tick_index: -34560 / price:   31.561185 / liquidity:        8273677051464 
tick_index: -34496 / price:   31.763814 / liquidity:        8214097150831 
tick_index: -34432 / price:   31.967745 / liquidity:        8165867095192 
tick_index: -34368 / price:   32.172984 / liquidity:        8236355055495 
tick_index: -34304 / price:   32.379541 / liquidity:        8236247148843 
tick_index: -34240 / price:   32.587424 / liquidity:        7939109282221 
tick_index: -34176 / price:   32.796642 / liquidity:        7959167230711 
tick_index: -34112 / price:   33.007203 / liquidity:        7991301193180 
tick_index: -34048 / price:   33.219116 / liquidity:        8039890161184 
tick_index: -33984 / price:   33.432389 / liquidity:        8026581539074 
tick_index: -33920 / price:   33.647032 / liquidity:        3479261809441 
tick_index: -33856 / price:   33.863053 / liquidity:        3551551823961 
tick_index: -33792 / price:   34.080460 / liquidity:        3515302477432 
tick_index: -33728 / price:   34.299264 / liquidity:        3513837669469 
tick_index: -33664 / price:   34.519472 / liquidity:        3512111179667 
tick_index: -33600 / price:   34.741094 / liquidity:        3571578344119 
tick_index: -33536 / price:   34.964139 / liquidity:        3589321410756 
tick_index: -33472 / price:   35.188616 / liquidity:        3947386359045 
tick_index: -33408 / price:   35.414534 / liquidity:        3927396469473 
tick_index: -33344 / price:   35.641902 / liquidity:        3927396469473 
tick_index: -33280 / price:   35.870730 / liquidity:        3927429759854 
tick_index: -33216 / price:   36.101028 / liquidity:        3901015138085 
tick_index: -33152 / price:   36.332804 / liquidity:        3866926954103 
tick_index: -33088 / price:   36.566068 / liquidity:        3857384102491 
tick_index: -33024 / price:   36.800829 / liquidity:        3739142397914 
tick_index: -32960 / price:   37.037098 / liquidity:        3620056100592 
tick_index: -32896 / price:   37.274883 / liquidity:        3649355401304 
tick_index: -32832 / price:   37.514196 / liquidity:        3214101357806 
tick_index: -32768 / price:   37.755044 / liquidity:        3209205321757 
tick_index: -32704 / price:   37.997439 / liquidity:        3162490353940 
tick_index: -32640 / price:   38.241391 / liquidity:        3132412270798 
tick_index: -32576 / price:   38.486908 / liquidity:        3302576740389 
tick_index: -32512 / price:   38.734002 / liquidity:        3248233878808 
tick_index: -32448 / price:   38.982682 / liquidity:        4024470253250 
tick_index: -32384 / price:   39.232959 / liquidity:        3475274188112 
tick_index: -32320 / price:   39.484842 / liquidity:        3515792393210 
tick_index: -32256 / price:   39.738343 / liquidity:        3521122152417 
tick_index: -32192 / price:   39.993471 / liquidity:        2962921551346 
tick_index: -32128 / price:   40.250237 / liquidity:        4274548100345 
tick_index: -32064 / price:   40.508652 / liquidity:        4305225664994 
tick_index: -32000 / price:   40.768726 / liquidity:        4307740448388 
tick_index: -31936 / price:   41.030469 / liquidity:        4219386004361 
tick_index: -31872 / price:   41.293893 / liquidity:        4232998561140 
tick_index: -31808 / price:   41.559008 / liquidity:        4223261947478 
tick_index: -31744 / price:   41.825825 / liquidity:        4212105844602 
tick_index: -31680 / price:   42.094355 / liquidity:        4222046028526 
tick_index: -31616 / price:   42.364610 / liquidity:        4253960046657 
tick_index: -31552 / price:   42.636599 / liquidity:        4272796487049 
tick_index: -31488 / price:   42.910335 / liquidity:        4261935442852 
tick_index: -31424 / price:   43.185828 / liquidity:        4612785441493 
tick_index: -31360 / price:   43.463089 / liquidity:        4612785441493 
tick_index: -31296 / price:   43.742131 / liquidity:        4610270658099 
tick_index: -31232 / price:   44.022964 / liquidity:        4305174685958 
tick_index: -31168 / price:   44.305601 / liquidity:        4339129457325 
tick_index: -31104 / price:   44.590052 / liquidity:        4021974015929 
tick_index: -31040 / price:   44.876329 / liquidity:        4069798402303 
tick_index: -30976 / price:   45.164444 / liquidity:        4076725967656 
tick_index: -30912 / price:   45.454409 / liquidity:        5049217083948 
tick_index: -30848 / price:   45.746235 / liquidity:        5061403301020 
tick_index: -30784 / price:   46.039935 / liquidity:        4782906649041 
tick_index: -30720 / price:   46.335521 / liquidity:        4782906649041 
tick_index: -30656 / price:   46.633004 / liquidity:        4765630145417 
tick_index: -30592 / price:   46.932398 / liquidity:        4763590838378 
tick_index: -30528 / price:   47.233713 / liquidity:        5057454667970 
tick_index: -30464 / price:   47.536963 / liquidity:        5057328456539 
tick_index: -30400 / price:   47.842160 / liquidity:        5057328456539 
tick_index: -30336 / price:   48.149316 / liquidity:        5062297216180 
tick_index: -30272 / price:   48.458445 / liquidity:        5062255736973 
tick_index: -30208 / price:   48.769558 / liquidity:        5061651313889 
tick_index: -30144 / price:   49.082668 / liquidity:        4928899264378 
tick_index: -30080 / price:   49.397789 / liquidity:        4928898912800 
tick_index: -30016 / price:   49.714932 / liquidity:        4928898912800 
tick_index: -29952 / price:   50.034112 / liquidity:        3344618800865 
tick_index: -29888 / price:   50.355341 / liquidity:        3344618668785 
tick_index: -29824 / price:   50.678633 / liquidity:        3246616092210 
tick_index: -29760 / price:   51.004000 / liquidity:        3228908708332 
tick_index: -29696 / price:   51.331456 / liquidity:        3223568216338 
tick_index: -29632 / price:   51.661014 / liquidity:        2941932229751 
tick_index: -29568 / price:   51.992688 / liquidity:        2941932229751 
tick_index: -29504 / price:   52.326492 / liquidity:        2916859759856 
tick_index: -29440 / price:   52.662439 / liquidity:        2552964691755 
tick_index: -29376 / price:   53.000542 / liquidity:        2468927843089 
tick_index: -29312 / price:   53.340816 / liquidity:        2469223534597 
tick_index: -29248 / price:   53.683275 / liquidity:        2469223534597 
tick_index: -29184 / price:   54.027932 / liquidity:        2469223534597 
tick_index: -29120 / price:   54.374803 / liquidity:        2466526392730 
tick_index: -29056 / price:   54.723900 / liquidity:        2461912922736 
tick_index: -28992 / price:   55.075238 / liquidity:        2461912922736 
tick_index: -28928 / price:   55.428832 / liquidity:        2461912922736 
tick_index: -28864 / price:   55.784697 / liquidity:        2461912922736 
tick_index: -28800 / price:   56.142846 / liquidity:        2408566752940 
tick_index: -28736 / price:   56.503294 / liquidity:        2390530240052 
tick_index: -28672 / price:   56.866057 / liquidity:        2390530240052 
tick_index: -28608 / price:   57.231148 / liquidity:        2299418427575 
tick_index: -28544 / price:   57.598584 / liquidity:        2263210945019 
tick_index: -28480 / price:   57.968378 / liquidity:        2229062422226 
tick_index: -28416 / price:   58.340547 / liquidity:        2192568428467 
tick_index: -28352 / price:   58.715105 / liquidity:        2197154774346 
tick_index: -28288 / price:   59.092068 / liquidity:        2192086448650 
tick_index: -28224 / price:   59.471451 / liquidity:        2190574385610 
tick_index: -28160 / price:   59.853270 / liquidity:        2190574385610 
tick_index: -28096 / price:   60.237540 / liquidity:        2127343797855 
tick_index: -28032 / price:   60.624277 / liquidity:        2127343797855 
tick_index: -27968 / price:   61.013497 / liquidity:        2127343797855 
tick_index: -27904 / price:   61.405216 / liquidity:        2127343797855 
tick_index: -27840 / price:   61.799450 / liquidity:        2127343797855 
tick_index: -27776 / price:   62.196215 / liquidity:        2125908819775 
tick_index: -27712 / price:   62.595527 / liquidity:        2125912075498 
tick_index: -27648 / price:   62.997403 / liquidity:        2123095721786 
tick_index: -27584 / price:   63.401859 / liquidity:        2123095721786 
tick_index: -27520 / price:   63.808912 / liquidity:        2110766805101 
tick_index: -27456 / price:   64.218578 / liquidity:        2110766805101 
tick_index: -27392 / price:   64.630874 / liquidity:        2108301363580 
tick_index: -27328 / price:   65.045817 / liquidity:        2064358901181 
tick_index: -27264 / price:   65.463425 / liquidity:        2064358901181 
tick_index: -27200 / price:   65.883713 / liquidity:        2064698570872 
tick_index: -27136 / price:   66.306700 / liquidity:        2064154534400 
tick_index: -27072 / price:   66.732402 / liquidity:        2062546615026 
tick_index: -27008 / price:   67.160838 / liquidity:        2066420771917 
tick_index: -26944 / price:   67.592024 / liquidity:        2066420771917 
tick_index: -26880 / price:   68.025978 / liquidity:        2067852457532 
tick_index: -26816 / price:   68.462719 / liquidity:        2068294463447 
tick_index: -26752 / price:   68.902263 / liquidity:        2068294463447 
tick_index: -26688 / price:   69.344629 / liquidity:        2051556396634 
tick_index: -26624 / price:   69.789836 / liquidity:        2051556396634 
tick_index: -26560 / price:   70.237901 / liquidity:        2067055312329 
tick_index: -26496 / price:   70.688842 / liquidity:        1991529675112 
tick_index: -26432 / price:   71.142679 / liquidity:        2005910643167 
tick_index: -26368 / price:   71.599429 / liquidity:        2005910643167 
tick_index: -26304 / price:   72.059112 / liquidity:        1970422000405 
tick_index: -26240 / price:   72.521746 / liquidity:        1983678942658 
tick_index: -26176 / price:   72.987350 / liquidity:        1985767417514 
tick_index: -26112 / price:   73.455944 / liquidity:        2017019586699 
tick_index: -26048 / price:   73.927546 / liquidity:        2008865749875 
tick_index: -25984 / price:   74.402176 / liquidity:        2014371096429 
tick_index: -25920 / price:   74.879853 / liquidity:        1865602367825 
tick_index: -25856 / price:   75.360596 / liquidity:       26822040966732 
tick_index: -25792 / price:   75.844427 / liquidity:       26822040966732 
tick_index: -25728 / price:   76.331363 / liquidity:        1862074197327 
tick_index: -25664 / price:   76.821426 / liquidity:        1862074197327 
tick_index: -25600 / price:   77.314635 / liquidity:        1862074197327 
tick_index: -25536 / price:   77.811010 / liquidity:         830535093450 
tick_index: -25472 / price:   78.310573 / liquidity:         831339651421 
tick_index: -25408 / price:   78.813343 / liquidity:         831339651421 
tick_index: -25344 / price:   79.319340 / liquidity:        1035045862663 
tick_index: -25280 / price:   79.828586 / liquidity:        1143476828478 
tick_index: -25216 / price:   80.341102 / liquidity:        1130509978253 
tick_index: -25152 / price:   80.856908 / liquidity:        1115196477728 
tick_index: -25088 / price:   81.376026 / liquidity:        1115199266293 
tick_index: -25024 / price:   81.898476 / liquidity:        1115202066721 
tick_index: -24960 / price:   82.424281 / liquidity:        1102552355527 
tick_index: -24896 / price:   82.953461 / liquidity:        1102556121553 
tick_index: -24832 / price:   83.486039 / liquidity:        1102553332988 
tick_index: -24768 / price:   84.022037 / liquidity:        1102553356868 
tick_index: -24704 / price:   84.561475 / liquidity:        1102553356868 
tick_index: -24640 / price:   85.104377 / liquidity:        1098042009748 
tick_index: -24576 / price:   85.650764 / liquidity:        1098042009748 
tick_index: -24512 / price:   86.200659 / liquidity:        1098042058665 
tick_index: -24448 / price:   86.754085 / liquidity:        1111170781838 
tick_index: -24384 / price:   87.311064 / liquidity:        1413846893618 
tick_index: -24320 / price:   87.871618 / liquidity:        1452487388434 
tick_index: -24256 / price:   88.435772 / liquidity:        1495468331617 
tick_index: -24192 / price:   89.003547 / liquidity:        1503332674611 
tick_index: -24128 / price:   89.574968 / liquidity:        1506806811944 
tick_index: -24064 / price:   90.150057 / liquidity:        1409564074245 
tick_index: -24000 / price:   90.728839 / liquidity:        1404744037269 
tick_index: -23936 / price:   91.311336 / liquidity:        1443600792076 
tick_index: -23872 / price:   91.897574 / liquidity:        1472471916561 
tick_index: -23808 / price:   92.487574 / liquidity:        1512946267364 
tick_index: -23744 / price:   93.081363 / liquidity:        1512946267364 
tick_index: -23680 / price:   93.678965 / liquidity:        1498329711629 
tick_index: -23616 / price:   94.280402 / liquidity:        1498329711629 
tick_index: -23552 / price:   94.885702 / liquidity:        1486777003104 
tick_index: -23488 / price:   95.494887 / liquidity:        1314610079018 
tick_index: -23424 / price:   96.107983 / liquidity:        1317526586559 
tick_index: -23360 / price:   96.725016 / liquidity:        1317526586559 
tick_index: -23296 / price:   97.346010 / liquidity:        1288655462074 
tick_index: -23232 / price:   97.970991 / liquidity:        1287164369436 
tick_index: -23168 / price:   98.599985 / liquidity:        2996780303553 
tick_index: -23104 / price:   99.233016 / liquidity:        6327591241926 
tick_index: -23040 / price:   99.870112 / liquidity:        6321660059754 
tick_index: -22976 / price:  100.511299 / liquidity:        6357833404057 
tick_index: -22912 / price:  101.156602 / liquidity:        6305782724220 
tick_index: -22848 / price:  101.806047 / liquidity:        6445965540169 
tick_index: -22784 / price:  102.459663 / liquidity:        6445965540169 
tick_index: -22720 / price:  103.117474 / liquidity:        4736877405127 
tick_index: -22656 / price:  103.779509 / liquidity:        4718948021965 
tick_index: -22592 / price:  104.445795 / liquidity:        4728125700091 
tick_index: -22528 / price:  105.116358 / liquidity:        4693287265814 
tick_index: -22464 / price:  105.791226 / liquidity:        4693287265814 
tick_index: -22400 / price:  106.470427 / liquidity:        4690399345191 
tick_index: -22336 / price:  107.153989 / liquidity:        4690399345191 
tick_index: -22272 / price:  107.841939 / liquidity:        4690324382723 
tick_index: -22208 / price:  108.534306 / liquidity:        4690324382723 
tick_index: -22144 / price:  109.231118 / liquidity:        4690324382723 
tick_index: -22080 / price:  109.932404 / liquidity:        4686522322184 
tick_index: -22016 / price:  110.638192 / liquidity:        4395203831038 
tick_index: -21952 / price:  111.348512 / liquidity:        1018874732424 
tick_index: -21888 / price:  112.063392 / liquidity:        1011520641479 
tick_index: -21824 / price:  112.782861 / liquidity:        1011374129019 
tick_index: -21760 / price:  113.506950 / liquidity:        1010029214935 
tick_index: -21696 / price:  114.235687 / liquidity:         971172460128 
tick_index: -21632 / price:  114.969104 / liquidity:         971172460128 
tick_index: -21568 / price:  115.707228 / liquidity:         952272417815 
tick_index: -21504 / price:  116.450092 / liquidity:         952272417815 
tick_index: -21440 / price:  117.197725 / liquidity:         952272417815 
tick_index: -21376 / price:  117.950158 / liquidity:         949600844021 
tick_index: -21312 / price:  118.707422 / liquidity:         949600844021 
tick_index: -21248 / price:  119.469548 / liquidity:         949600844021 
tick_index: -21184 / price:  120.236566 / liquidity:         939663458908 
tick_index: -21120 / price:  121.008509 / liquidity:         939663458908 
tick_index: -21056 / price:  121.785408 / liquidity:         939663458908 
tick_index: -20992 / price:  122.567295 / liquidity:         893379594476 
tick_index: -20928 / price:  123.354202 / liquidity:         893284736456 
tick_index: -20864 / price:  124.146161 / liquidity:         893284736456 
tick_index: -20800 / price:  124.943204 / liquidity:         879752698665 
tick_index: -20736 / price:  125.745365 / liquidity:         874768735204 
tick_index: -20672 / price:  126.552675 / liquidity:         874768735204 
tick_index: -20608 / price:  127.365169 / liquidity:         877187642151 
tick_index: -20544 / price:  128.182879 / liquidity:         877187642151 
tick_index: -20480 / price:  129.005839 / liquidity:         863348935304 
tick_index: -20416 / price:  129.834083 / liquidity:         859873847408 
tick_index: -20352 / price:  130.667644 / liquidity:         859873847408 
tick_index: -20288 / price:  131.506556 / liquidity:         721029373143 
tick_index: -20224 / price:  132.350855 / liquidity:         721029373143 
tick_index: -20160 / price:  133.200574 / liquidity:         660210263213 
tick_index: -20096 / price:  134.055749 / liquidity:         660210263213 
tick_index: -20032 / price:  134.916414 / liquidity:         657823599866 
tick_index: -19968 / price:  135.782604 / liquidity:         613263820064 
tick_index: -19904 / price:  136.654356 / liquidity:         613263820064 
tick_index: -19840 / price:  137.531705 / liquidity:         613263820064 
tick_index: -19776 / price:  138.414686 / liquidity:         611882424263 
tick_index: -19712 / price:  139.303336 / liquidity:         611882424263 
tick_index: -19648 / price:  140.197692 / liquidity:         611882424263 
tick_index: -19584 / price:  141.097789 / liquidity:         608225152504 
tick_index: -19520 / price:  142.003665 / liquidity:         608225152504 
tick_index: -19456 / price:  142.915357 / liquidity:         608225152504 
tick_index: -19392 / price:  143.832903 / liquidity:         608225152504 
tick_index: -19328 / price:  144.756339 / liquidity:         608225152504 
tick_index: -19264 / price:  145.685704 / liquidity:         608225152504 
tick_index: -19200 / price:  146.621036 / liquidity:         602919309998 
tick_index: -19136 / price:  147.562372 / liquidity:         602919309998 
tick_index: -19072 / price:  148.509752 / liquidity:         602919309998 
tick_index: -19008 / price:  149.463215 / liquidity:         602919309998 
tick_index: -18944 / price:  150.422799 / liquidity:         602391510923 
tick_index: -18880 / price:  151.388544 / liquidity:         602391510923 
tick_index: -18816 / price:  152.360489 / liquidity:         602391510923 
tick_index: -18752 / price:  153.338674 / liquidity:         602391510923 
tick_index: -18688 / price:  154.323139 / liquidity:         602391510923 
tick_index: -18624 / price:  155.313925 / liquidity:         602391510923 
tick_index: -18560 / price:  156.311071 / liquidity:         602391510923 
tick_index: -18496 / price:  157.314620 / liquidity:         602391510923 
tick_index: -18432 / price:  158.324612 / liquidity:         602391510923 
tick_index: -18368 / price:  159.341088 / liquidity:         602391510923 
tick_index: -18304 / price:  160.364090 / liquidity:         602391510923 
tick_index: -18240 / price:  161.393659 / liquidity:         602391510923 
tick_index: -18176 / price:  162.429839 / liquidity:         601051940733 
tick_index: -18112 / price:  163.472672 / liquidity:         593097085090 
tick_index: -18048 / price:  164.522199 / liquidity:         588871597538 
tick_index: -17984 / price:  165.578465 / liquidity:         588871597538 
tick_index: -17920 / price:  166.641512 / liquidity:         587954117272 
tick_index: -17856 / price:  167.711384 / liquidity:         587119828781 
tick_index: -17792 / price:  168.788125 / liquidity:         587119828781 
tick_index: -17728 / price:  169.871779 / liquidity:         477400763933 
tick_index: -17664 / price:  170.962390 / liquidity:         477400763933 
tick_index: -17600 / price:  172.060003 / liquidity:         477400763933 
tick_index: -17536 / price:  173.164663 / liquidity:         477400763933 
tick_index: -17472 / price:  174.276415 / liquidity:         477400763933 
tick_index: -17408 / price:  175.395305 / liquidity:         477400763933 
tick_index: -17344 / price:  176.521378 / liquidity:         477400763933 
tick_index: -17280 / price:  177.654681 / liquidity:         477400763933 
tick_index: -17216 / price:  178.795260 / liquidity:         477400763933 
tick_index: -17152 / price:  179.943161 / liquidity:         477400763933 
tick_index: -17088 / price:  181.098433 / liquidity:         477400763933 
tick_index: -17024 / price:  182.261121 / liquidity:         477400763933 
tick_index: -16960 / price:  183.431274 / liquidity:         477400763933 
current pool liquidity: 13265161544075
current index: -36851
current initializable tick index: -36864
liquidity difference (liquidity in TickArray not read): 470082663185

*/