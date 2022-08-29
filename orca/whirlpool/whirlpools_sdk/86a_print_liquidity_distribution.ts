import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import {
    WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG, buildWhirlpoolClient,
    PDAUtil, PriceMath, TickUtil, TICK_ARRAY_SIZE
} from "@orca-so/whirlpools-sdk";
import { Wallet, BN } from "@project-serum/anchor";

const RPC_ENDPOINT_URL="https://ssc-dao.genesysgo.net"

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL);
  console.log("connection endpoint", connection.rpcEndpoint);
  
  const dummy_wallet = new Wallet(Keypair.generate());
  const ctx = WhirlpoolContext.from(connection, dummy_wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const client = buildWhirlpoolClient(ctx);

  // famous tokens
  const SOL = {mint: new PublicKey("So11111111111111111111111111111111111111112"), decimals: 9};
  const ORCA = {mint: new PublicKey("orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE"), decimals: 6};
  const WBTC = {mint: new PublicKey("9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E"), decimals: 6};
  const WETH = {mint: new PublicKey("7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs"), decimals: 8};
  const MSOL = {mint: new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"), decimals: 9};
  const MNDE = {mint: new PublicKey("MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey"), decimals: 9};
  const SAMO = {mint: new PublicKey("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"), decimals: 9};
  const USDC = {mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), decimals: 6};
  const USDT = {mint: new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"), decimals: 6};
  const TICK_SPACING_STABLE = 1;
  const TICK_SPACING_STANDARD = 64;

  // select input
  // The list of Orca UI supported whirlpools. (it contains tokenMintA, tokenMintB and tickSpacing)
  // https://orca-so.gitbook.io/orca-developer-portal/whirlpools/interacting-with-the-protocol/orca-whirlpools-parameters#orca-ui-supported-whirlpools
  const token_a = SOL;
  const token_b = USDC;
  const tick_spacing = TICK_SPACING_STANDARD;

  // get whirlpool
  const whirlpool_key = PDAUtil.getWhirlpool(
    ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG,
    token_a.mint, token_b.mint, tick_spacing).publicKey;
  console.log("whirlpool_key", whirlpool_key.toBase58());
  const whirlpool = client.getPool(whirlpool_key);
  const whirlpool_data = (await whirlpool).getData();

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
  const tickarrays = await ctx.fetcher.listTickArrays(tickarray_pubkeys, true);

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

      // liquidity in TickArray not read
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

$ ts-node src/86a_print_liquidity_distribution.ts 
connection endpoint https://ssc-dao.genesysgo.net
whirlpool_key HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
tick_index: -56320 / price:    3.582413 / liquidity:          12180425058 
tick_index: -56256 / price:    3.605413 / liquidity:          12180425058 
tick_index: -56192 / price:    3.628561 / liquidity:          12180425058 
tick_index: -56128 / price:    3.651857 / liquidity:          12180425058 
tick_index: -56064 / price:    3.675303 / liquidity:          12180425058 
tick_index: -56000 / price:    3.698899 / liquidity:          12180425058 
tick_index: -55936 / price:    3.722646 / liquidity:          12180425058 
tick_index: -55872 / price:    3.746547 / liquidity:          12180425058 
tick_index: -55808 / price:    3.770600 / liquidity:          12180425058 
tick_index: -55744 / price:    3.794808 / liquidity:          12180425058 
tick_index: -55680 / price:    3.819172 / liquidity:          12180425058 
tick_index: -55616 / price:    3.843691 / liquidity:          12180425058 
tick_index: -55552 / price:    3.868369 / liquidity:          12180425058 
tick_index: -55488 / price:    3.893204 / liquidity:          12180425058 
tick_index: -55424 / price:    3.918200 / liquidity:          12180425058 
tick_index: -55360 / price:    3.943355 / liquidity:          12180425058 
tick_index: -55296 / price:    3.968672 / liquidity:          12180425058 
tick_index: -55232 / price:    3.994152 / liquidity:          12180425058 
tick_index: -55168 / price:    4.019795 / liquidity:          12180425058 
tick_index: -55104 / price:    4.045603 / liquidity:          12180425058 
tick_index: -55040 / price:    4.071577 / liquidity:          12180425058 
tick_index: -54976 / price:    4.097717 / liquidity:          12180425058 
tick_index: -54912 / price:    4.124025 / liquidity:          12180425058 
tick_index: -54848 / price:    4.150502 / liquidity:          12180425058 
tick_index: -54784 / price:    4.177149 / liquidity:          12180425058 
tick_index: -54720 / price:    4.203968 / liquidity:          12180425058 
tick_index: -54656 / price:    4.230958 / liquidity:          12180425058 
tick_index: -54592 / price:    4.258122 / liquidity:          12180425058 
tick_index: -54528 / price:    4.285460 / liquidity:          12180425058 
tick_index: -54464 / price:    4.312973 / liquidity:          12180425058 
tick_index: -54400 / price:    4.340663 / liquidity:          12180425058 
tick_index: -54336 / price:    4.368531 / liquidity:          12180425058 
tick_index: -54272 / price:    4.396578 / liquidity:          12180425058 
tick_index: -54208 / price:    4.424805 / liquidity:          12180425058 
tick_index: -54144 / price:    4.453213 / liquidity:          12180425058 
tick_index: -54080 / price:    4.481804 / liquidity:          12180425058 
tick_index: -54016 / price:    4.510578 / liquidity:          12180425058 
tick_index: -53952 / price:    4.539536 / liquidity:          12180425058 
tick_index: -53888 / price:    4.568681 / liquidity:          12180425058 
tick_index: -53824 / price:    4.598013 / liquidity:          12180425058 
tick_index: -53760 / price:    4.627533 / liquidity:          12180425058 
tick_index: -53696 / price:    4.657243 / liquidity:          12180425058 
tick_index: -53632 / price:    4.687143 / liquidity:          12180425058 
tick_index: -53568 / price:    4.717236 / liquidity:          12180425058 
tick_index: -53504 / price:    4.747521 / liquidity:          12180425058 
tick_index: -53440 / price:    4.778001 / liquidity:          12180425058 
tick_index: -53376 / price:    4.808677 / liquidity:          12180425058 
tick_index: -53312 / price:    4.839550 / liquidity:          12180425058 
tick_index: -53248 / price:    4.870621 / liquidity:          12180425058 
tick_index: -53184 / price:    4.901891 / liquidity:          12180425058 
tick_index: -53120 / price:    4.933362 / liquidity:          12180425058 
tick_index: -53056 / price:    4.965035 / liquidity:          12180425058 
tick_index: -52992 / price:    4.996912 / liquidity:          12180425058 
tick_index: -52928 / price:    5.028993 / liquidity:          12180425058 
tick_index: -52864 / price:    5.061280 / liquidity:          12180425058 
tick_index: -52800 / price:    5.093775 / liquidity:          12180425058 
tick_index: -52736 / price:    5.126478 / liquidity:          12180425058 
tick_index: -52672 / price:    5.159391 / liquidity:          12180425058 
tick_index: -52608 / price:    5.192515 / liquidity:          12180425058 
tick_index: -52544 / price:    5.225852 / liquidity:          12180425058 
tick_index: -52480 / price:    5.259403 / liquidity:          12180425058 
tick_index: -52416 / price:    5.293170 / liquidity:          12180425058 
tick_index: -52352 / price:    5.327153 / liquidity:          12180425058 
tick_index: -52288 / price:    5.361354 / liquidity:          12180425058 
tick_index: -52224 / price:    5.395775 / liquidity:          12180425058 
tick_index: -52160 / price:    5.430417 / liquidity:          12180425058 
tick_index: -52096 / price:    5.465282 / liquidity:          12180425058 
tick_index: -52032 / price:    5.500370 / liquidity:          12180425058 
tick_index: -51968 / price:    5.535683 / liquidity:          12180425058 
tick_index: -51904 / price:    5.571224 / liquidity:          12180425058 
tick_index: -51840 / price:    5.606992 / liquidity:          12180425058 
tick_index: -51776 / price:    5.642990 / liquidity:          12180425058 
tick_index: -51712 / price:    5.679219 / liquidity:          12180425058 
tick_index: -51648 / price:    5.715681 / liquidity:          12180425058 
tick_index: -51584 / price:    5.752377 / liquidity:          12180425058 
tick_index: -51520 / price:    5.789308 / liquidity:          12180425058 
tick_index: -51456 / price:    5.826477 / liquidity:          12180425058 
tick_index: -51392 / price:    5.863884 / liquidity:          12180425058 
tick_index: -51328 / price:    5.901531 / liquidity:          12180425058 
tick_index: -51264 / price:    5.939420 / liquidity:          12180425058 
tick_index: -51200 / price:    5.977552 / liquidity:          12180425058 
tick_index: -51136 / price:    6.015929 / liquidity:          16075692734 
tick_index: -51072 / price:    6.054553 / liquidity:          16075692734 
tick_index: -51008 / price:    6.093424 / liquidity:          16075692734 
tick_index: -50944 / price:    6.132545 / liquidity:          16075692734 
tick_index: -50880 / price:    6.171918 / liquidity:          16075692734 
tick_index: -50816 / price:    6.211543 / liquidity:          16075692734 
tick_index: -50752 / price:    6.251422 / liquidity:          16075692734 
tick_index: -50688 / price:    6.291557 / liquidity:          16075692734 
tick_index: -50624 / price:    6.331950 / liquidity:          16075692734 
tick_index: -50560 / price:    6.372603 / liquidity:          16075692734 
tick_index: -50496 / price:    6.413516 / liquidity:          16075692734 
tick_index: -50432 / price:    6.454692 / liquidity:          16075692734 
tick_index: -50368 / price:    6.496133 / liquidity:          16075692734 
tick_index: -50304 / price:    6.537839 / liquidity:          16075692734 
tick_index: -50240 / price:    6.579813 / liquidity:          16075692734 
tick_index: -50176 / price:    6.622057 / liquidity:          16075692734 
tick_index: -50112 / price:    6.664572 / liquidity:          16075692734 
tick_index: -50048 / price:    6.707360 / liquidity:          16075692734 
tick_index: -49984 / price:    6.750423 / liquidity:          16075692734 
tick_index: -49920 / price:    6.793762 / liquidity:          16075692734 
tick_index: -49856 / price:    6.837379 / liquidity:          16075692734 
tick_index: -49792 / price:    6.881276 / liquidity:          16075692734 
tick_index: -49728 / price:    6.925456 / liquidity:          16075692734 
tick_index: -49664 / price:    6.969918 / liquidity:          16075692734 
tick_index: -49600 / price:    7.014667 / liquidity:          16075692734 
tick_index: -49536 / price:    7.059702 / liquidity:          16075692734 
tick_index: -49472 / price:    7.105027 / liquidity:          16075692734 
tick_index: -49408 / price:    7.150643 / liquidity:          16075692734 
tick_index: -49344 / price:    7.196551 / liquidity:          16075692734 
tick_index: -49280 / price:    7.242755 / liquidity:          16075692734 
tick_index: -49216 / price:    7.289254 / liquidity:          16075692734 
tick_index: -49152 / price:    7.336053 / liquidity:          16075692734 
tick_index: -49088 / price:    7.383152 / liquidity:          16075692734 
tick_index: -49024 / price:    7.430553 / liquidity:          16075692734 
tick_index: -48960 / price:    7.478259 / liquidity:          16075692734 
tick_index: -48896 / price:    7.526271 / liquidity:          16075692734 
tick_index: -48832 / price:    7.574591 / liquidity:          16075692734 
tick_index: -48768 / price:    7.623221 / liquidity:          16075692734 
tick_index: -48704 / price:    7.672164 / liquidity:          16075692734 
tick_index: -48640 / price:    7.721421 / liquidity:          16075692734 
tick_index: -48576 / price:    7.770994 / liquidity:          16075692734 
tick_index: -48512 / price:    7.820885 / liquidity:          16075692734 
tick_index: -48448 / price:    7.871097 / liquidity:          16075692734 
tick_index: -48384 / price:    7.921631 / liquidity:          16075692734 
tick_index: -48320 / price:    7.972489 / liquidity:          16075692734 
tick_index: -48256 / price:    8.023674 / liquidity:          21747618141 
tick_index: -48192 / price:    8.075188 / liquidity:          21747618141 
tick_index: -48128 / price:    8.127032 / liquidity:          21747618141 
tick_index: -48064 / price:    8.179210 / liquidity:          21747618141 
tick_index: -48000 / price:    8.231722 / liquidity:          21747618141 
tick_index: -47936 / price:    8.284571 / liquidity:          21747618141 
tick_index: -47872 / price:    8.337760 / liquidity:          21747618141 
tick_index: -47808 / price:    8.391290 / liquidity:          21747618141 
tick_index: -47744 / price:    8.445164 / liquidity:          21747618141 
tick_index: -47680 / price:    8.499383 / liquidity:          21747618141 
tick_index: -47616 / price:    8.553951 / liquidity:          21747618141 
tick_index: -47552 / price:    8.608869 / liquidity:          21747618141 
tick_index: -47488 / price:    8.664140 / liquidity:          21747618141 
tick_index: -47424 / price:    8.719765 / liquidity:          21747618141 
tick_index: -47360 / price:    8.775748 / liquidity:          21747618141 
tick_index: -47296 / price:    8.832090 / liquidity:          21747618141 
tick_index: -47232 / price:    8.888794 / liquidity:          21747618141 
tick_index: -47168 / price:    8.945862 / liquidity:          21747618141 
tick_index: -47104 / price:    9.003296 / liquidity:          21747618141 
tick_index: -47040 / price:    9.061099 / liquidity:          21747618141 
tick_index: -46976 / price:    9.119273 / liquidity:          21747618141 
tick_index: -46912 / price:    9.177821 / liquidity:          21747618141 
tick_index: -46848 / price:    9.236744 / liquidity:          21747618141 
tick_index: -46784 / price:    9.296046 / liquidity:          21747618141 
tick_index: -46720 / price:    9.355728 / liquidity:          21747618141 
tick_index: -46656 / price:    9.415794 / liquidity:          21747618141 
tick_index: -46592 / price:    9.476245 / liquidity:          21747618141 
tick_index: -46528 / price:    9.537085 / liquidity:          21747618141 
tick_index: -46464 / price:    9.598315 / liquidity:          21747618141 
tick_index: -46400 / price:    9.659938 / liquidity:          21747618141 
tick_index: -46336 / price:    9.721957 / liquidity:          21747618141 
tick_index: -46272 / price:    9.784374 / liquidity:          21747618141 
tick_index: -46208 / price:    9.847191 / liquidity:          21747618141 
tick_index: -46144 / price:    9.910412 / liquidity:          21747618141 
tick_index: -46080 / price:    9.974039 / liquidity:          21747618141 
tick_index: -46016 / price:   10.038074 / liquidity:          21747618141 
tick_index: -45952 / price:   10.102521 / liquidity:          21747618141 
tick_index: -45888 / price:   10.167381 / liquidity:          21747618141 
tick_index: -45824 / price:   10.232658 / liquidity:          21747618141 
tick_index: -45760 / price:   10.298353 / liquidity:          21747618141 
tick_index: -45696 / price:   10.364471 / liquidity:          21747618141 
tick_index: -45632 / price:   10.431013 / liquidity:          21747618141 
tick_index: -45568 / price:   10.497982 / liquidity:          21747618141 
tick_index: -45504 / price:   10.565381 / liquidity:          21747618141 
tick_index: -45440 / price:   10.633213 / liquidity:          21747618141 
tick_index: -45376 / price:   10.701481 / liquidity:          21747618141 
tick_index: -45312 / price:   10.770186 / liquidity:          21747618141 
tick_index: -45248 / price:   10.839333 / liquidity:          21747618141 
tick_index: -45184 / price:   10.908924 / liquidity:          21747618141 
tick_index: -45120 / price:   10.978961 / liquidity:          21747618141 
tick_index: -45056 / price:   11.049448 / liquidity:          21747618141 
tick_index: -44992 / price:   11.120388 / liquidity:          21747618141 
tick_index: -44928 / price:   11.191783 / liquidity:          21747618141 
tick_index: -44864 / price:   11.263637 / liquidity:          21747618141 
tick_index: -44800 / price:   11.335951 / liquidity:          21747618141 
tick_index: -44736 / price:   11.408731 / liquidity:          21747618141 
tick_index: -44672 / price:   11.481977 / liquidity:          21747618141 
tick_index: -44608 / price:   11.555694 / liquidity:          21747618141 
tick_index: -44544 / price:   11.629883 / liquidity:          21747618141 
tick_index: -44480 / price:   11.704550 / liquidity:          21747618141 
tick_index: -44416 / price:   11.779695 / liquidity:          21747618141 
tick_index: -44352 / price:   11.855323 / liquidity:          21747618141 
tick_index: -44288 / price:   11.931437 / liquidity:          21747618141 
tick_index: -44224 / price:   12.008039 / liquidity:          21747618141 
tick_index: -44160 / price:   12.085133 / liquidity:          21747618141 
tick_index: -44096 / price:   12.162722 / liquidity:          21747618141 
tick_index: -44032 / price:   12.240809 / liquidity:          47742520996 
tick_index: -43968 / price:   12.319398 / liquidity:          47742520996 
tick_index: -43904 / price:   12.398491 / liquidity:          47742520996 
tick_index: -43840 / price:   12.478091 / liquidity:          47742520996 
tick_index: -43776 / price:   12.558203 / liquidity:          47742520996 
tick_index: -43712 / price:   12.638830 / liquidity:          47742520996 
tick_index: -43648 / price:   12.719973 / liquidity:          47742520996 
tick_index: -43584 / price:   12.801638 / liquidity:          47742520996 
tick_index: -43520 / price:   12.883827 / liquidity:          47742520996 
tick_index: -43456 / price:   12.966544 / liquidity:          47742520996 
tick_index: -43392 / price:   13.049792 / liquidity:          47742520996 
tick_index: -43328 / price:   13.133574 / liquidity:          47742520996 
tick_index: -43264 / price:   13.217894 / liquidity:          47742520996 
tick_index: -43200 / price:   13.302756 / liquidity:          47742520996 
tick_index: -43136 / price:   13.388162 / liquidity:          47742520996 
tick_index: -43072 / price:   13.474117 / liquidity:          47742520996 
tick_index: -43008 / price:   13.560624 / liquidity:          47742520996 
tick_index: -42944 / price:   13.647686 / liquidity:          47742520996 
tick_index: -42880 / price:   13.735306 / liquidity:          47742520996 
tick_index: -42816 / price:   13.823490 / liquidity:          47742520996 
tick_index: -42752 / price:   13.912239 / liquidity:          47742520996 
tick_index: -42688 / price:   14.001559 / liquidity:          47742520996 
tick_index: -42624 / price:   14.091452 / liquidity:          47742520996 
tick_index: -42560 / price:   14.181922 / liquidity:          47742520996 
tick_index: -42496 / price:   14.272972 / liquidity:          47742520996 
tick_index: -42432 / price:   14.364608 / liquidity:          47742520996 
tick_index: -42368 / price:   14.456831 / liquidity:          47742520996 
tick_index: -42304 / price:   14.549647 / liquidity:          47742520996 
tick_index: -42240 / price:   14.643059 / liquidity:          47742520996 
tick_index: -42176 / price:   14.737070 / liquidity:          47742520996 
tick_index: -42112 / price:   14.831685 / liquidity:          47742520996 
tick_index: -42048 / price:   14.926908 / liquidity:          47742520996 
tick_index: -41984 / price:   15.022741 / liquidity:          51859749264 
tick_index: -41920 / price:   15.119191 / liquidity:          51859749264 
tick_index: -41856 / price:   15.216259 / liquidity:          51859749264 
tick_index: -41792 / price:   15.313950 / liquidity:          74867490327 
tick_index: -41728 / price:   15.412269 / liquidity:          74867490327 
tick_index: -41664 / price:   15.511219 / liquidity:          74867490327 
tick_index: -41600 / price:   15.610804 / liquidity:          74867490327 
tick_index: -41536 / price:   15.711028 / liquidity:          74867490327 
tick_index: -41472 / price:   15.811896 / liquidity:          74867490327 
tick_index: -41408 / price:   15.913412 / liquidity:          74867490327 
tick_index: -41344 / price:   16.015579 / liquidity:          74867490327 
tick_index: -41280 / price:   16.118403 / liquidity:          74867490327 
tick_index: -41216 / price:   16.221886 / liquidity:          74867490327 
tick_index: -41152 / price:   16.326034 / liquidity:          74867490327 
tick_index: -41088 / price:   16.430850 / liquidity:          74867490327 
tick_index: -41024 / price:   16.536340 / liquidity:          74867490327 
tick_index: -40960 / price:   16.642506 / liquidity:          74867490327 
tick_index: -40896 / price:   16.749354 / liquidity:          74867490327 
tick_index: -40832 / price:   16.856889 / liquidity:          74867490327 
tick_index: -40768 / price:   16.965113 / liquidity:          74867490327 
tick_index: -40704 / price:   17.074033 / liquidity:          74867490327 
tick_index: -40640 / price:   17.183651 / liquidity:          74867490327 
tick_index: -40576 / price:   17.293974 / liquidity:          74867490327 
tick_index: -40512 / price:   17.405005 / liquidity:          74867490327 
tick_index: -40448 / price:   17.516748 / liquidity:          74867490327 
tick_index: -40384 / price:   17.629210 / liquidity:          74867490327 
tick_index: -40320 / price:   17.742393 / liquidity:          74867490327 
tick_index: -40256 / price:   17.856302 / liquidity:          99012595397 
tick_index: -40192 / price:   17.970943 / liquidity:          99012595397 
tick_index: -40128 / price:   18.086320 / liquidity:         115129565757 
tick_index: -40064 / price:   18.202438 / liquidity:         115129565757 
tick_index: -40000 / price:   18.319302 / liquidity:         115129565757 
tick_index: -39936 / price:   18.436915 / liquidity:         231071692773 
tick_index: -39872 / price:   18.555284 / liquidity:         231071692773 
tick_index: -39808 / price:   18.674413 / liquidity:         231071692773 
tick_index: -39744 / price:   18.794306 / liquidity:         231071692773 
tick_index: -39680 / price:   18.914969 / liquidity:         231071692773 
tick_index: -39616 / price:   19.036407 / liquidity:         231071692773 
tick_index: -39552 / price:   19.158625 / liquidity:         231385846674 
tick_index: -39488 / price:   19.281627 / liquidity:         231385846674 
tick_index: -39424 / price:   19.405419 / liquidity:         231385846674 
tick_index: -39360 / price:   19.530006 / liquidity:         231385846674 
tick_index: -39296 / price:   19.655392 / liquidity:         235208182124 
tick_index: -39232 / price:   19.781584 / liquidity:         235208182124 
tick_index: -39168 / price:   19.908586 / liquidity:         235208182124 
tick_index: -39104 / price:   20.036403 / liquidity:        2915402483420 
tick_index: -39040 / price:   20.165041 / liquidity:        2915402483420 
tick_index: -38976 / price:   20.294504 / liquidity:        2915402483420 
tick_index: -38912 / price:   20.424799 / liquidity:        2915402483420 
tick_index: -38848 / price:   20.555930 / liquidity:        2915402483420 
tick_index: -38784 / price:   20.687904 / liquidity:        2915402483420 
tick_index: -38720 / price:   20.820724 / liquidity:        2915402483420 
tick_index: -38656 / price:   20.954397 / liquidity:        2915402483420 
tick_index: -38592 / price:   21.088929 / liquidity:        2997369021064 
tick_index: -38528 / price:   21.224324 / liquidity:        2997369021064 
tick_index: -38464 / price:   21.360588 / liquidity:        2997369021064 
tick_index: -38400 / price:   21.497728 / liquidity:        2997369021064 
tick_index: -38336 / price:   21.635747 / liquidity:        2997369021064 
tick_index: -38272 / price:   21.774653 / liquidity:        2997369021064 
tick_index: -38208 / price:   21.914451 / liquidity:        2997369021064 
tick_index: -38144 / price:   22.055146 / liquidity:        3414898364326 
tick_index: -38080 / price:   22.196745 / liquidity:        3430117071636 
tick_index: -38016 / price:   22.339252 / liquidity:        3430117071636 
tick_index: -37952 / price:   22.482675 / liquidity:        3461447729301 
tick_index: -37888 / price:   22.627018 / liquidity:        3461447729301 
tick_index: -37824 / price:   22.772288 / liquidity:        3461447729301 
tick_index: -37760 / price:   22.918491 / liquidity:        3461447729301 
tick_index: -37696 / price:   23.065632 / liquidity:        3802080087407 
tick_index: -37632 / price:   23.213718 / liquidity:        3803125772380 
tick_index: -37568 / price:   23.362755 / liquidity:        3803125772380 
tick_index: -37504 / price:   23.512749 / liquidity:        3803125772380 
tick_index: -37440 / price:   23.663705 / liquidity:        3803125772380 
tick_index: -37376 / price:   23.815631 / liquidity:        3814216393768 
tick_index: -37312 / price:   23.968532 / liquidity:        3814216393768 
tick_index: -37248 / price:   24.122415 / liquidity:        3931583614436 
tick_index: -37184 / price:   24.277286 / liquidity:        3931583614436 
tick_index: -37120 / price:   24.433151 / liquidity:        3938753709892 
tick_index: -37056 / price:   24.590016 / liquidity:        3951018390815 
tick_index: -36992 / price:   24.747889 / liquidity:        3979124874548 
tick_index: -36928 / price:   24.906776 / liquidity:        3979674648714 
tick_index: -36864 / price:   25.066682 / liquidity:        5595875366771 
tick_index: -36800 / price:   25.227615 / liquidity:        5595916125372 
tick_index: -36736 / price:   25.389582 / liquidity:        5617875416445 
tick_index: -36672 / price:   25.552588 / liquidity:        5617875416445 
tick_index: -36608 / price:   25.716641 / liquidity:        5617875416445 
tick_index: -36544 / price:   25.881747 / liquidity:        5840847142398 
tick_index: -36480 / price:   26.047913 / liquidity:        6160398930695 
tick_index: -36416 / price:   26.215146 / liquidity:        6211959673610 
tick_index: -36352 / price:   26.383452 / liquidity:        6529266810735 
tick_index: -36288 / price:   26.552839 / liquidity:        6543520176405 
tick_index: -36224 / price:   26.723314 / liquidity:        6556880568415 
tick_index: -36160 / price:   26.894883 / liquidity:        6710997956064 
tick_index: -36096 / price:   27.067554 / liquidity:        7952884234175 
tick_index: -36032 / price:   27.241333 / liquidity:        7952884234175 
tick_index: -35968 / price:   27.416228 / liquidity:        7952884234175 
tick_index: -35904 / price:   27.592245 / liquidity:        8577250399659 
tick_index: -35840 / price:   27.769393 / liquidity:       19002185546654 
tick_index: -35776 / price:   27.947678 / liquidity:       19125541423922 
tick_index: -35712 / price:   28.127108 / liquidity:       19285272881685 
tick_index: -35648 / price:   28.307690 / liquidity:       20277507753955 
tick_index: -35584 / price:   28.489431 / liquidity:       20808771151962 
tick_index: -35520 / price:   28.672339 / liquidity:       24635412171307 
tick_index: -35456 / price:   28.856421 / liquidity:       25073823191666 
tick_index: -35392 / price:   29.041685 / liquidity:       26132908789978 
tick_index: -35328 / price:   29.228138 / liquidity:       27694427135211 
tick_index: -35264 / price:   29.415789 / liquidity:       28077919651961 
tick_index: -35200 / price:   29.604644 / liquidity:       28244972860430 
tick_index: -35136 / price:   29.794712 / liquidity:       28630210651126 
tick_index: -35072 / price:   29.986000 / liquidity:       34566488755293 
tick_index: -35008 / price:   30.178516 / liquidity:       39229625052375 
tick_index: -34944 / price:   30.372268 / liquidity:       42845620099314  <== CURRENT
tick_index: -34880 / price:   30.567265 / liquidity:       42377541829688 
tick_index: -34816 / price:   30.763513 / liquidity:       43179132066892 
tick_index: -34752 / price:   30.961021 / liquidity:       43103650085573 
tick_index: -34688 / price:   31.159797 / liquidity:       42913383063873 
tick_index: -34624 / price:   31.359849 / liquidity:       50779716349230 
tick_index: -34560 / price:   31.561185 / liquidity:       67052884881796 
tick_index: -34496 / price:   31.763814 / liquidity:       64723294246299 
tick_index: -34432 / price:   31.967745 / liquidity:       65225710300764 
tick_index: -34368 / price:   32.172984 / liquidity:       67327218010892 
tick_index: -34304 / price:   32.379541 / liquidity:       59812394783395 
tick_index: -34240 / price:   32.587424 / liquidity:       59823051472996 
tick_index: -34176 / price:   32.796642 / liquidity:       59483407361084 
tick_index: -34112 / price:   33.007203 / liquidity:       62435408096230 
tick_index: -34048 / price:   33.219116 / liquidity:       62755088951123 
tick_index: -33984 / price:   33.432389 / liquidity:       59207483315931 
tick_index: -33920 / price:   33.647032 / liquidity:       71583078927666 
tick_index: -33856 / price:   33.863053 / liquidity:       71449379693486 
tick_index: -33792 / price:   34.080460 / liquidity:       68643008449900 
tick_index: -33728 / price:   34.299264 / liquidity:       67982230330026 
tick_index: -33664 / price:   34.519472 / liquidity:       68136026678515 
tick_index: -33600 / price:   34.741094 / liquidity:       68921988185759 
tick_index: -33536 / price:   34.964139 / liquidity:       68707488348069 
tick_index: -33472 / price:   35.188616 / liquidity:       76248523599432 
tick_index: -33408 / price:   35.414534 / liquidity:       76230586596229 
tick_index: -33344 / price:   35.641902 / liquidity:       76155071203017 
tick_index: -33280 / price:   35.870730 / liquidity:       76399216403036 
tick_index: -33216 / price:   36.101028 / liquidity:       76373692427961 
tick_index: -33152 / price:   36.332804 / liquidity:       77300511156074 
tick_index: -33088 / price:   36.566068 / liquidity:       76527539932963 
tick_index: -33024 / price:   36.800829 / liquidity:       76484305313179 
tick_index: -32960 / price:   37.037098 / liquidity:       76527552501829 
tick_index: -32896 / price:   37.274883 / liquidity:       76249415374322 
tick_index: -32832 / price:   37.514196 / liquidity:       76113258830145 
tick_index: -32768 / price:   37.755044 / liquidity:       75586363447167 
tick_index: -32704 / price:   37.997439 / liquidity:       72368871638051 
tick_index: -32640 / price:   38.241391 / liquidity:      115869348372410 
tick_index: -32576 / price:   38.486908 / liquidity:      140149120971017 
tick_index: -32512 / price:   38.734002 / liquidity:      140204983224564 
tick_index: -32448 / price:   38.982682 / liquidity:      144371374987374 
tick_index: -32384 / price:   39.232959 / liquidity:      144590735273671 
tick_index: -32320 / price:   39.484842 / liquidity:      144632502999255 
tick_index: -32256 / price:   39.738343 / liquidity:      144442528737522 
tick_index: -32192 / price:   39.993471 / liquidity:      144840743995032 
tick_index: -32128 / price:   40.250237 / liquidity:      141925331991807 
tick_index: -32064 / price:   40.508652 / liquidity:      141971535343667 
tick_index: -32000 / price:   40.768726 / liquidity:      132998044653507 
tick_index: -31936 / price:   41.030469 / liquidity:      132848931427364 
tick_index: -31872 / price:   41.293893 / liquidity:      131622663866296 
tick_index: -31808 / price:   41.559008 / liquidity:      131648204535031 
tick_index: -31744 / price:   41.825825 / liquidity:      131755313070717 
tick_index: -31680 / price:   42.094355 / liquidity:      131342488143094 
tick_index: -31616 / price:   42.364610 / liquidity:      131938823132121 
tick_index: -31552 / price:   42.636599 / liquidity:      132356814206960 
tick_index: -31488 / price:   42.910335 / liquidity:      132343614057701 
tick_index: -31424 / price:   43.185828 / liquidity:      131690525781216 
tick_index: -31360 / price:   43.463089 / liquidity:      131732488451864 
tick_index: -31296 / price:   43.742131 / liquidity:      131935015884171 
tick_index: -31232 / price:   44.022964 / liquidity:      117037718079866 
tick_index: -31168 / price:   44.305601 / liquidity:      116952424229115 
tick_index: -31104 / price:   44.590052 / liquidity:      116635268787719 
tick_index: -31040 / price:   44.876329 / liquidity:      115542540846136 
tick_index: -30976 / price:   45.164444 / liquidity:      111963572067994 
tick_index: -30912 / price:   45.454409 / liquidity:      112961029104665 
tick_index: -30848 / price:   45.746235 / liquidity:      112962844624549 
tick_index: -30784 / price:   46.039935 / liquidity:      110159149223216 
tick_index: -30720 / price:   46.335521 / liquidity:      110098534341208 
tick_index: -30656 / price:   46.633004 / liquidity:      109609531042118 
tick_index: -30592 / price:   46.932398 / liquidity:      109575756590917 
tick_index: -30528 / price:   47.233713 / liquidity:      109543439216480 
tick_index: -30464 / price:   47.536963 / liquidity:      109279474594008 
tick_index: -30400 / price:   47.842160 / liquidity:      124122307770867 
tick_index: -30336 / price:   48.149316 / liquidity:      122081725086590 
tick_index: -30272 / price:   48.458445 / liquidity:      107359298066192 
tick_index: -30208 / price:   48.769558 / liquidity:      107242988797924 
tick_index: -30144 / price:   49.082668 / liquidity:      106670390212901 
tick_index: -30080 / price:   49.397789 / liquidity:      102145330774851 
tick_index: -30016 / price:   49.714932 / liquidity:      102145330774851 
tick_index: -29952 / price:   50.034112 / liquidity:      101207484291689 
tick_index: -29888 / price:   50.355341 / liquidity:      101119901096797 
tick_index: -29824 / price:   50.678633 / liquidity:       76018233902875 
tick_index: -29760 / price:   51.004000 / liquidity:       75208493109468 
tick_index: -29696 / price:   51.331456 / liquidity:       74878376959596 
tick_index: -29632 / price:   51.661014 / liquidity:       74580073891852 
tick_index: -29568 / price:   51.992688 / liquidity:       74564011322049 
tick_index: -29504 / price:   52.326492 / liquidity:       74460697215477 
tick_index: -29440 / price:   52.662439 / liquidity:       73139135628825 
tick_index: -29376 / price:   53.000542 / liquidity:       73044395305915 
tick_index: -29312 / price:   53.340816 / liquidity:       73062176778825 
tick_index: -29248 / price:   53.683275 / liquidity:       73056201515768 
tick_index: -29184 / price:   54.027932 / liquidity:       51846129646949 
tick_index: -29120 / price:   54.374803 / liquidity:       51832660302927 
tick_index: -29056 / price:   54.723900 / liquidity:       51762345009019 
tick_index: -28992 / price:   55.075238 / liquidity:        8090074296098 
tick_index: -28928 / price:   55.428832 / liquidity:        8090074296098 
tick_index: -28864 / price:   55.784697 / liquidity:        8090074296098 
tick_index: -28800 / price:   56.142846 / liquidity:        7857736431349 
tick_index: -28736 / price:   56.503294 / liquidity:        7567169097910 
tick_index: -28672 / price:   56.866057 / liquidity:        7562429559699 
tick_index: -28608 / price:   57.231148 / liquidity:        7405942754520 
tick_index: -28544 / price:   57.598584 / liquidity:        6257529756857 
tick_index: -28480 / price:   57.968378 / liquidity:        6218972617821 
tick_index: -28416 / price:   58.340547 / liquidity:        6174044010293 
tick_index: -28352 / price:   58.715105 / liquidity:       36678930577276 
tick_index: -28288 / price:   59.092068 / liquidity:        6166761981923 
tick_index: -28224 / price:   59.471451 / liquidity:        6140702074810 
tick_index: -28160 / price:   59.853270 / liquidity:        6140702074810 
tick_index: -28096 / price:   60.237540 / liquidity:        6075362735428 
tick_index: -28032 / price:   60.624277 / liquidity:        5867862330230 
tick_index: -27968 / price:   61.013497 / liquidity:        5286052494108 
tick_index: -27904 / price:   61.405216 / liquidity:        5283791003191 
tick_index: -27840 / price:   61.799450 / liquidity:        5283791003191 
tick_index: -27776 / price:   62.196215 / liquidity:        5282356414405 
tick_index: -27712 / price:   62.595527 / liquidity:        5282359864033 
tick_index: -27648 / price:   62.997403 / liquidity:        5279543510321 
tick_index: -27584 / price:   63.401859 / liquidity:        5239007674261 
tick_index: -27520 / price:   63.808912 / liquidity:        5226678757576 
tick_index: -27456 / price:   64.218578 / liquidity:        5211291952704 
tick_index: -27392 / price:   64.630874 / liquidity:        5208754259909 
tick_index: -27328 / price:   65.045817 / liquidity:        4851675048295 
tick_index: -27264 / price:   65.463425 / liquidity:        4851675048295 
tick_index: -27200 / price:   65.883713 / liquidity:        4929316667117 
tick_index: -27136 / price:   66.306700 / liquidity:        4928222856479 
tick_index: -27072 / price:   66.732402 / liquidity:        4926614937105 
tick_index: -27008 / price:   67.160838 / liquidity:        5141428516982 
tick_index: -26944 / price:   67.592024 / liquidity:        5141428516982 
tick_index: -26880 / price:   68.025978 / liquidity:        4730515842183 
tick_index: -26816 / price:   68.462719 / liquidity:        4730957848098 
tick_index: -26752 / price:   68.902263 / liquidity:        4730957848098 
tick_index: -26688 / price:   69.344629 / liquidity:        4697049527540 
tick_index: -26624 / price:   69.789836 / liquidity:        4778880441310 
tick_index: -26560 / price:   70.237901 / liquidity:        4889406069546 
tick_index: -26496 / price:   70.688842 / liquidity:        4855393800536 
tick_index: -26432 / price:   71.142679 / liquidity:        4897558971899 
tick_index: -26368 / price:   71.599429 / liquidity:        4897558971899 
tick_index: -26304 / price:   72.059112 / liquidity:        4898316042350 
tick_index: -26240 / price:   72.521746 / liquidity:        4911572984603 
tick_index: -26176 / price:   72.987350 / liquidity:        4913661459459 
tick_index: -26112 / price:   73.455944 / liquidity:        4956264906173 
tick_index: -26048 / price:   73.927546 / liquidity:        4948111069349 
tick_index: -25984 / price:   74.402176 / liquidity:        4966766627283 
tick_index: -25920 / price:   74.879853 / liquidity:        4724440828341 
tick_index: -25856 / price:   75.360596 / liquidity:        4721885491716 
tick_index: -25792 / price:   75.844427 / liquidity:        4722026645726 
tick_index: -25728 / price:   76.331363 / liquidity:        4722570236900 
tick_index: -25664 / price:   76.821426 / liquidity:        4679906565831 
tick_index: -25600 / price:   77.314635 / liquidity:        4666756354451 
tick_index: -25536 / price:   77.811010 / liquidity:        3647823572304 
tick_index: -25472 / price:   78.310573 / liquidity:        3649049597291 
tick_index: -25408 / price:   78.813343 / liquidity:        3649049597291 
tick_index: -25344 / price:   79.319340 / liquidity:        3853364722237 
tick_index: -25280 / price:   79.828586 / liquidity:        3970214149106 
tick_index: -25216 / price:   80.341102 / liquidity:        2907056587953 
tick_index: -25152 / price:   80.856908 / liquidity:        2894341190304 
tick_index: -25088 / price:   81.376026 / liquidity:        2879953619549 
tick_index: -25024 / price:   81.898476 / liquidity:        2879956419977 
tick_index: -24960 / price:   82.424281 / liquidity:        2867306708783 
tick_index: -24896 / price:   82.953461 / liquidity:        3060014798411 
tick_index: -24832 / price:   83.486039 / liquidity:        3060012009846 
tick_index: -24768 / price:   84.022037 / liquidity:        3060012033726 
tick_index: -24704 / price:   84.561475 / liquidity:        3060012033726 
tick_index: -24640 / price:   85.104377 / liquidity:        3055500686606 
tick_index: -24576 / price:   85.650764 / liquidity:        3052631383881 
tick_index: -24512 / price:   86.200659 / liquidity:        3029623691735 
tick_index: -24448 / price:   86.754085 / liquidity:        3041100847401 
tick_index: -24384 / price:   87.311064 / liquidity:        3381992272766 
tick_index: -24320 / price:   87.871618 / liquidity:        3420632767582 
tick_index: -24256 / price:   88.435772 / liquidity:        3439419449059 
tick_index: -24192 / price:   89.003547 / liquidity:        3485064782594 
tick_index: -24128 / price:   89.574968 / liquidity:        3488538919927 
tick_index: -24064 / price:   90.150057 / liquidity:        3389593066390 
tick_index: -24000 / price:   90.728839 / liquidity:        3289670170983 
tick_index: -23936 / price:   91.311336 / liquidity:        3329614292640 
tick_index: -23872 / price:   91.897574 / liquidity:        3358485417125 
tick_index: -23808 / price:   92.487574 / liquidity:        3399846543350 
tick_index: -23744 / price:   93.081363 / liquidity:        2176334481273 
tick_index: -23680 / price:   93.678965 / liquidity:        2157808853868 
tick_index: -23616 / price:   94.280402 / liquidity:        2157808853868 
tick_index: -23552 / price:   94.885702 / liquidity:        2146256145343 
tick_index: -23488 / price:   95.494887 / liquidity:        1998299572636 
tick_index: -23424 / price:   96.107983 / liquidity:        1999915418552 
tick_index: -23360 / price:   96.725016 / liquidity:        1810665755314 
tick_index: -23296 / price:   97.346010 / liquidity:        1781794630829 
tick_index: -23232 / price:   97.970991 / liquidity:        1776402252842 
tick_index: -23168 / price:   98.599985 / liquidity:        3482563526595 
tick_index: -23104 / price:   99.233016 / liquidity:        6813374464968 
tick_index: -23040 / price:   99.870112 / liquidity:        6807443282796 
tick_index: -22976 / price:  100.511299 / liquidity:        6843858637073 
tick_index: -22912 / price:  101.156602 / liquidity:        6782313092643 
tick_index: -22848 / price:  101.806047 / liquidity:        6932846856323 
tick_index: -22784 / price:  102.459663 / liquidity:        6932846856323 
tick_index: -22720 / price:  103.117474 / liquidity:        5223758721281 
tick_index: -22656 / price:  103.779509 / liquidity:        5203565478077 
tick_index: -22592 / price:  104.445795 / liquidity:        5216856362154 
tick_index: -22528 / price:  105.116358 / liquidity:        5182017927877 
tick_index: -22464 / price:  105.791226 / liquidity:        5182017927877 
tick_index: -22400 / price:  106.470427 / liquidity:        5179130007254 
tick_index: -22336 / price:  107.153989 / liquidity:        5179130007254 
tick_index: -22272 / price:  107.841939 / liquidity:        5179055044786 
tick_index: -22208 / price:  108.534306 / liquidity:        5179055044786 
tick_index: -22144 / price:  109.231118 / liquidity:        5179055044786 
tick_index: -22080 / price:  109.932404 / liquidity:        5162091123725 
tick_index: -22016 / price:  110.638192 / liquidity:        4807522301316 
tick_index: -21952 / price:  111.348512 / liquidity:        1430664562764 
tick_index: -21888 / price:  112.063392 / liquidity:        1422412434827 
tick_index: -21824 / price:  112.782861 / liquidity:        1422265922367 
tick_index: -21760 / price:  113.506950 / liquidity:        1354833242042 
tick_index: -21696 / price:  114.235687 / liquidity:        1314191166204 
tick_index: -21632 / price:  114.969104 / liquidity:        1314191166204 
tick_index: -21568 / price:  115.707228 / liquidity:        1292376552403 
tick_index: -21504 / price:  116.450092 / liquidity:        1292376552403 
tick_index: -21440 / price:  117.197725 / liquidity:        1292376552403 
tick_index: -21376 / price:  117.950158 / liquidity:        1289704978609 
tick_index: -21312 / price:  118.707422 / liquidity:        1289704978609 
tick_index: -21248 / price:  119.469548 / liquidity:        1289704978609 
tick_index: -21184 / price:  120.236566 / liquidity:        1279767593496 
tick_index: -21120 / price:  121.008509 / liquidity:        1260005091019 
tick_index: -21056 / price:  121.785408 / liquidity:        1223329192880 
tick_index: -20992 / price:  122.567295 / liquidity:        1177045328448 
tick_index: -20928 / price:  123.354202 / liquidity:        1176221737457 
tick_index: -20864 / price:  124.146161 / liquidity:        1176221737457 
tick_index: -20800 / price:  124.943204 / liquidity:        1162689699666 
tick_index: -20736 / price:  125.745365 / liquidity:        1148533007524 
tick_index: -20672 / price:  126.552675 / liquidity:        1140834850139 
tick_index: -20608 / price:  127.365169 / liquidity:        1143278190489 
tick_index: -20544 / price:  128.182879 / liquidity:        1143278190489 
tick_index: -20480 / price:  129.005839 / liquidity:        1129439483642 
tick_index: -20416 / price:  129.834083 / liquidity:        1125367132238 
tick_index: -20352 / price:  130.667644 / liquidity:        1122200242069 
tick_index: -20288 / price:  131.506556 / liquidity:         970634148938 
tick_index: -20224 / price:  132.350855 / liquidity:         970634148938 
tick_index: -20160 / price:  133.200574 / liquidity:         651520486688 
tick_index: -20096 / price:  134.055749 / liquidity:         651520486688 
tick_index: -20032 / price:  134.916414 / liquidity:         644267704496 
tick_index: -19968 / price:  135.782604 / liquidity:         599439824836 
tick_index: -19904 / price:  136.654356 / liquidity:         599439824836 
tick_index: -19840 / price:  137.531705 / liquidity:         599439824836 
tick_index: -19776 / price:  138.414686 / liquidity:         590622901786 
tick_index: -19712 / price:  139.303336 / liquidity:         583997647662 
tick_index: -19648 / price:  140.197692 / liquidity:         583997647662 
tick_index: -19584 / price:  141.097789 / liquidity:         580340375903 
tick_index: -19520 / price:  142.003665 / liquidity:         580340375903 
tick_index: -19456 / price:  142.915357 / liquidity:         580340375903 
tick_index: -19392 / price:  143.832903 / liquidity:         580340375903 
tick_index: -19328 / price:  144.756339 / liquidity:         580340375903 
tick_index: -19264 / price:  145.685704 / liquidity:         580340375903 
tick_index: -19200 / price:  146.621036 / liquidity:         363268821710 
tick_index: -19136 / price:  147.562372 / liquidity:         363268821710 
tick_index: -19072 / price:  148.509752 / liquidity:         363268821710 
tick_index: -19008 / price:  149.463215 / liquidity:         363268821710 
tick_index: -18944 / price:  150.422799 / liquidity:         355382830225 
tick_index: -18880 / price:  151.388544 / liquidity:         355382830225 
tick_index: -18816 / price:  152.360489 / liquidity:         355382830225 
tick_index: -18752 / price:  153.338674 / liquidity:         355382830225 
tick_index: -18688 / price:  154.323139 / liquidity:         355382830225 
tick_index: -18624 / price:  155.313925 / liquidity:         355382830225 
tick_index: -18560 / price:  156.311071 / liquidity:         355382830225 
tick_index: -18496 / price:  157.314620 / liquidity:         355382830225 
tick_index: -18432 / price:  158.324612 / liquidity:         355382830225 
tick_index: -18368 / price:  159.341088 / liquidity:         355382830225 
tick_index: -18304 / price:  160.364090 / liquidity:         355382830225 
tick_index: -18240 / price:  161.393659 / liquidity:         355382830225 
tick_index: -18176 / price:  162.429839 / liquidity:         354043260035 
tick_index: -18112 / price:  163.472672 / liquidity:         333768654699 
tick_index: -18048 / price:  164.522199 / liquidity:         329543167147 
tick_index: -17984 / price:  165.578465 / liquidity:         329543167147 
tick_index: -17920 / price:  166.641512 / liquidity:         328625686881 
tick_index: -17856 / price:  167.711384 / liquidity:         314250347144 
tick_index: -17792 / price:  168.788125 / liquidity:         314250347144 
tick_index: -17728 / price:  169.871779 / liquidity:          34945105384 
tick_index: -17664 / price:  170.962390 / liquidity:          33857738534 
tick_index: -17600 / price:  172.060003 / liquidity:          33857738534 
tick_index: -17536 / price:  173.164663 / liquidity:          33857738534 
tick_index: -17472 / price:  174.276415 / liquidity:          33857738534 
tick_index: -17408 / price:  175.395305 / liquidity:          33857738534 
tick_index: -17344 / price:  176.521378 / liquidity:          33857738534 
tick_index: -17280 / price:  177.654681 / liquidity:          33857738534 
tick_index: -17216 / price:  178.795260 / liquidity:          33857738534 
tick_index: -17152 / price:  179.943161 / liquidity:          33857738534 
tick_index: -17088 / price:  181.098433 / liquidity:          33857738534 
tick_index: -17024 / price:  182.261121 / liquidity:          33857738534 
tick_index: -16960 / price:  183.431274 / liquidity:          33857738534 
current pool liquidity: 42845620099314
current index: -34908
current initializable tick index: -34944
liquidity difference (liquidity in TickArray not read): 12180425058

*/