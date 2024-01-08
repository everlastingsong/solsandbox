import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import {
    WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PriceMath, TICK_ARRAY_SIZE, getAccountSize, AccountName, ParsableTickArray, MIN_TICK_INDEX, PoolUtil
} from "@orca-so/whirlpools-sdk";
import { Wallet, BN } from "@coral-xyz/anchor";
import { DecimalUtil, ZERO } from "@orca-so/common-sdk";
import Decimal from "decimal.js";

type LiquidityDistribution = {
  start_tick_index: number;
  end_tick_index: number;
  liquidity: BN;
};

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

  // get tickarrays
  const tickarray_accounts = await connection.getProgramAccounts(ctx.program.programId, {
    commitment: "confirmed",
    encoding: "base64",
    filters: [
      { dataSize: getAccountSize(AccountName.TickArray) },
      // You can get 9956 from the following page: "whirlpool PublicKey@9956"
      // https://everlastingsong.github.io/account-microscope/#/whirlpool/tickarray/EVqGhR2ukNuqZNfvFFAitrX6UqrRm2r8ayKX9LH9xHzK
      { memcmp: { offset: 9956, bytes: whirlpool_key.toBase58() } },
    ],
  });
  const tickarrays = tickarray_accounts.map((a) => ParsableTickArray.parse(a.pubkey, a.account)!);

  // sort tickarrays by startTickIndex (asc)
  tickarrays.sort((a, b) => a.startTickIndex - b.startTickIndex);

  // sweep liquidity
  const liquidity_distribution: LiquidityDistribution[] = [];
  let current_lower_tick_index = MIN_TICK_INDEX;
  let current_liquidity = new BN(0);
  for ( let ta=0; ta<tickarrays.length; ta++ ) {
    const tickarray = tickarrays[ta];

    for ( let i=0; i<TICK_ARRAY_SIZE; i++ ) {
      if ( tickarray.ticks[i].liquidityNet.isZero() ) continue;

      if (current_liquidity.gt(ZERO)) {
        const tick_index = tickarray.startTickIndex + i*tick_spacing;

        liquidity_distribution.push({
          start_tick_index: current_lower_tick_index,
          end_tick_index: tick_index,
          liquidity: current_liquidity,
        });

        current_lower_tick_index = tick_index;
      }

      // move right (add liquidityNet)
      current_liquidity = current_liquidity.add(tickarray.ticks[i].liquidityNet);
    }
  }

  let amount_a_sum = new Decimal(0);
  let amount_b_sum = new Decimal(0);
  for ( const ld of liquidity_distribution ) {
    const lower_price = PriceMath.tickIndexToPrice(ld.start_tick_index, token_a.decimals, token_b.decimals);
    const upper_price = PriceMath.tickIndexToPrice(ld.end_tick_index, token_a.decimals, token_b.decimals);
    const lower_sqrt_price = PriceMath.tickIndexToSqrtPriceX64(ld.start_tick_index);
    const upper_sqrt_price = PriceMath.tickIndexToSqrtPriceX64(ld.end_tick_index);
    const clamp_sqrt_price = BN.min(BN.max(whirlpool_data.sqrtPrice, lower_sqrt_price), upper_sqrt_price);
    const amounts = PoolUtil.getTokenAmountsFromLiquidity(
      ld.liquidity,
      clamp_sqrt_price,
      PriceMath.tickIndexToSqrtPriceX64(ld.start_tick_index),
      PriceMath.tickIndexToSqrtPriceX64(ld.end_tick_index),
      true,
    )
    const amount_a = DecimalUtil.fromBN(amounts.tokenA, token_a.decimals).toSignificantDigits(4);
    const amount_b = DecimalUtil.fromBN(amounts.tokenB, token_b.decimals).toSignificantDigits(4);
    console.log(`tick: ${ld.start_tick_index} ~ ${ld.end_tick_index} / price: ${lower_price.toSignificantDigits(4)} ~ ${upper_price.toSignificantDigits(4)} / liq: ${ld.liquidity} / tokens: ${amount_a} + ${amount_b}`);

    amount_a_sum = amount_a_sum.add(amount_a);
    amount_b_sum = amount_b_sum.add(amount_b);
  }

  console.log("amount_a_sum", amount_a_sum.toString());
  console.log("amount_b_sum", amount_b_sum.toString());
}

main();

/*

SAMPLE OUTPUT(SOL/USDC):

$ ts-node 86d_print_liquidity_distribution_all_with_gpa_with_amount.ts 
tick: -443636 ~ -138112 / price: 0.00000000000000005421 ~ 0.001005 / liq: 15565769178 / tokens: 0 + 15.6
tick: -138112 ~ -94592 / price: 0.001005 ~ 0.078 / liq: 15567309186 / tokens: 0 + 121.8
tick: -94592 ~ -58048 / price: 0.078 ~ 3.013 / liq: 15569202956 / tokens: 0 + 717.2
tick: -58048 ~ -52928 / price: 3.013 ~ 5.028 / liq: 15600507577 / tokens: 0 + 249.8
tick: -52928 ~ -49792 / price: 5.028 ~ 6.881 / liq: 18269826151 / tokens: 0 + 219.9
tick: -49792 ~ -48640 / price: 6.881 ~ 7.721 / liq: 33332605882 / tokens: 0 + 163.9
tick: -48640 ~ -48000 / price: 7.721 ~ 8.231 / liq: 33332822783 / tokens: 0 + 95.23
tick: -48000 ~ -47488 / price: 8.231 ~ 8.664 / liq: 34507728935 / tokens: 0 + 81.18
tick: -47488 ~ -47360 / price: 8.664 ~ 8.775 / liq: 34534131336 / tokens: 0 + 20.63
tick: -47360 ~ -47104 / price: 8.775 ~ 9.003 / liq: 38452286407 / tokens: 0 + 46.4
tick: -47104 ~ -46976 / price: 9.003 ~ 9.119 / liq: 38583218599 / tokens: 0 + 23.5
tick: -46976 ~ -46848 / price: 9.119 ~ 9.236 / liq: 47850579283 / tokens: 0 + 29.33
tick: -46848 ~ -46016 / price: 9.236 ~ 10.03 / liq: 49527999728 / tokens: 0 + 202.1
tick: -46016 ~ -45952 / price: 10.03 ~ 10.1 / liq: 841555113892 / tokens: 0 + 270.2
tick: -45952 ~ -45696 / price: 10.1 ~ 10.36 / liq: 841528711491 / tokens: 0 + 1089
tick: -45696 ~ -45568 / price: 10.36 ~ 10.49 / liq: 841528980514 / tokens: 0 + 550
tick: -45568 ~ -45504 / price: 10.49 ~ 10.56 / liq: 844093574358 / tokens: 0 + 277.1
tick: -45504 ~ -45440 / price: 10.56 ~ 10.63 / liq: 878428051895 / tokens: 0 + 289.3
tick: -45440 ~ -44736 / price: 10.63 ~ 11.4 / liq: 878782314977 / tokens: 0 + 3246
tick: -44736 ~ -44672 / price: 11.4 ~ 11.48 / liq: 879114142703 / tokens: 0 + 300.9
tick: -44672 ~ -44480 / price: 11.48 ~ 11.7 / liq: 881268205437 / tokens: 0 + 910.8
tick: -44480 ~ -44416 / price: 11.7 ~ 11.77 / liq: 894561110374 / tokens: 0 + 310.1
tick: -44416 ~ -44224 / price: 11.77 ~ 12 / liq: 894721127570 / tokens: 0 + 936.6
tick: -44224 ~ -44096 / price: 12 ~ 12.16 / liq: 897253782967 / tokens: 0 + 631.2
tick: -44096 ~ -43776 / price: 12.16 ~ 12.55 / liq: 898649720046 / tokens: 0 + 1598
tick: -43776 ~ -43584 / price: 12.55 ~ 12.8 / liq: 898667395552 / tokens: 0 + 971.4
tick: -43584 ~ -43072 / price: 12.8 ~ 13.47 / liq: 898669643195 / tokens: 0 + 2636
tick: -43072 ~ -42688 / price: 13.47 ~ 14 / liq: 898838054062 / tokens: 0 + 2022
tick: -42688 ~ -42432 / price: 14 ~ 14.36 / liq: 896305398665 / tokens: 0 + 1366
tick: -42432 ~ -42240 / price: 14.36 ~ 14.64 / liq: 896305398784 / tokens: 0 + 1036
tick: -42240 ~ -41984 / price: 14.64 ~ 15.02 / liq: 894151336050 / tokens: 0 + 1393
tick: -41984 ~ -41920 / price: 15.02 ~ 15.11 / liq: 894085131668 / tokens: 0 + 351.2
tick: -41920 ~ -41856 / price: 15.11 ~ 15.21 / liq: 886250196489 / tokens: 0 + 349.2
tick: -41856 ~ -41792 / price: 15.21 ~ 15.31 / liq: 884917408391 / tokens: 0 + 349.8
tick: -41792 ~ -41664 / price: 15.31 ~ 15.51 / liq: 884917406917 / tokens: 0 + 703
tick: -41664 ~ -41600 / price: 15.51 ~ 15.61 / liq: 884757389721 / tokens: 0 + 353.1
tick: -41600 ~ -41472 / price: 15.61 ~ 15.81 / liq: 884757972920 / tokens: 0 + 709.7
tick: -41472 ~ -41408 / price: 15.81 ~ 15.91 / liq: 880839817849 / tokens: 0 + 354.9
tick: -41408 ~ -41344 / price: 15.91 ~ 16.01 / liq: 880819894700 / tokens: 0 + 356.1
tick: -41344 ~ -41152 / price: 16.01 ~ 16.32 / liq: 875687847151 / tokens: 0 + 1068
tick: -41152 ~ -40960 / price: 16.32 ~ 16.64 / liq: 876069728331 / tokens: 0 + 1079
tick: -40960 ~ -40320 / price: 16.64 ~ 17.74 / liq: 876070655382 / tokens: 0 + 3674
tick: -40320 ~ -40064 / price: 17.74 ~ 18.2 / liq: 875848016699 / tokens: 0 + 1502
tick: -40064 ~ -39872 / price: 18.2 ~ 18.55 / liq: 875850603795 / tokens: 0 + 1139
tick: -39872 ~ -39808 / price: 18.55 ~ 18.67 / liq: 876197928414 / tokens: 0 + 382.5
tick: -39808 ~ -39744 / price: 18.67 ~ 18.79 / liq: 876460828132 / tokens: 0 + 383.8
tick: -39744 ~ -39680 / price: 18.79 ~ 18.91 / liq: 876518454933 / tokens: 0 + 385.1
tick: -39680 ~ -39616 / price: 18.91 ~ 19.03 / liq: 877187327259 / tokens: 0 + 386.6
tick: -39616 ~ -39552 / price: 19.03 ~ 19.15 / liq: 887375292578 / tokens: 0 + 392.3
tick: -39552 ~ -39424 / price: 19.15 ~ 19.4 / liq: 887391196252 / tokens: 0 + 788.5
tick: -39424 ~ -39360 / price: 19.4 ~ 19.53 / liq: 886722323926 / tokens: 0 + 395.8
tick: -39360 ~ -39296 / price: 19.53 ~ 19.65 / liq: 886736028643 / tokens: 0 + 397.1
tick: -39296 ~ -39168 / price: 19.65 ~ 19.9 / liq: 886897440260 / tokens: 0 + 798.2
tick: -39168 ~ -39104 / price: 19.9 ~ 20.03 / liq: 886687342374 / tokens: 0 + 400.9
tick: -39104 ~ -39040 / price: 20.03 ~ 20.16 / liq: 99550636228 / tokens: 0 + 45.16
tick: -39040 ~ -38912 / price: 20.16 ~ 20.42 / liq: 99389224611 / tokens: 0 + 90.61
tick: -38912 ~ -38592 / price: 20.42 ~ 21.08 / liq: 104703222991 / tokens: 0 + 241.3
tick: -38592 ~ -38528 / price: 21.08 ~ 21.22 / liq: 131117844760 / tokens: 0 + 61.02
tick: -38528 ~ -38400 / price: 21.22 ~ 21.49 / liq: 131117859533 / tokens: 0 + 122.6
tick: -38400 ~ -38336 / price: 21.49 ~ 21.63 / liq: 131242168846 / tokens: 0 + 61.67
tick: -38336 ~ -38272 / price: 21.63 ~ 21.77 / liq: 131244280201 / tokens: 0 + 61.87
tick: -38272 ~ -38144 / price: 21.77 ~ 22.05 / liq: 131278058834 / tokens: 0 + 124.3
tick: -38144 ~ -38080 / price: 22.05 ~ 22.19 / liq: 140364698753 / tokens: 0 + 66.8
tick: -38080 ~ -38016 / price: 22.19 ~ 22.33 / liq: 141795021852 / tokens: 0 + 67.7
tick: -38016 ~ -37952 / price: 22.33 ~ 22.48 / liq: 156932804050 / tokens: 0 + 75.17
tick: -37952 ~ -37888 / price: 22.48 ~ 22.62 / liq: 156930216835 / tokens: 0 + 75.41
tick: -37888 ~ -37824 / price: 22.62 ~ 22.77 / liq: 157050925720 / tokens: 0 + 75.71
tick: -37824 ~ -37696 / price: 22.77 ~ 23.06 / liq: 177163421444 / tokens: 0 + 171.6
tick: -37696 ~ -37632 / price: 23.06 ~ 23.21 / liq: 177890402573 / tokens: 0 + 86.58
tick: -37632 ~ -37376 / price: 23.21 ~ 23.81 / liq: 165764868438 / tokens: 0 + 325.3
tick: -37376 ~ -37248 / price: 23.81 ~ 24.12 / liq: 165870479884 / tokens: 0 + 164.3
tick: -37248 ~ -37120 / price: 24.12 ~ 24.43 / liq: 165856775167 / tokens: 0 + 165.3
tick: -37120 ~ -37056 / price: 24.43 ~ 24.59 / liq: 197910614492 / tokens: 0 + 99.14
tick: -37056 ~ -36928 / price: 24.59 ~ 24.9 / liq: 201527286434 / tokens: 0 + 202.8
tick: -36928 ~ -36864 / price: 24.9 ~ 25.06 / liq: 213967104188 / tokens: 0 + 108.2
tick: -36864 ~ -36800 / price: 25.06 ~ 25.22 / liq: 300785875427 / tokens: 0 + 152.6
tick: -36800 ~ -36672 / price: 25.22 ~ 25.55 / liq: 301640253857 / tokens: 0 + 307.5
tick: -36672 ~ -36608 / price: 25.55 ~ 25.71 / liq: 304947676144 / tokens: 0 + 156.2
tick: -36608 ~ -36544 / price: 25.71 ~ 25.88 / liq: 314314568748 / tokens: 0 + 161.5
tick: -36544 ~ -36480 / price: 25.88 ~ 26.04 / liq: 328064738940 / tokens: 0 + 169.1
tick: -36480 ~ -36416 / price: 26.04 ~ 26.21 / liq: 316853324290 / tokens: 0 + 163.8
tick: -36416 ~ -36288 / price: 26.21 ~ 26.55 / liq: 317869803280 / tokens: 0 + 330.4
tick: -36288 ~ -36224 / price: 26.55 ~ 26.72 / liq: 319551645949 / tokens: 0 + 166.8
tick: -36224 ~ -36096 / price: 26.72 ~ 27.06 / liq: 319169764769 / tokens: 0 + 334.9
tick: -36096 ~ -36032 / price: 27.06 ~ 27.24 / liq: 337615561341 / tokens: 0 + 178
tick: -36032 ~ -35904 / price: 27.24 ~ 27.59 / liq: 337643885209 / tokens: 0 + 357.7
tick: -35904 ~ -35776 / price: 27.59 ~ 27.94 / liq: 337678197423 / tokens: 0 + 360.1
tick: -35776 ~ -35712 / price: 27.94 ~ 28.12 / liq: 337906911091 / tokens: 0 + 181
tick: -35712 ~ -35648 / price: 28.12 ~ 28.3 / liq: 337948874877 / tokens: 0 + 181.6
tick: -35648 ~ -35584 / price: 28.3 ~ 28.48 / liq: 310348957839 / tokens: 0 + 167.3
tick: -35584 ~ -35520 / price: 28.48 ~ 28.67 / liq: 321419532548 / tokens: 0 + 173.8
tick: -35520 ~ -35456 / price: 28.67 ~ 28.85 / liq: 321427474578 / tokens: 0 + 174.4
tick: -35456 ~ -35392 / price: 28.85 ~ 29.04 / liq: 339948502189 / tokens: 0 + 185
tick: -35392 ~ -35328 / price: 29.04 ~ 29.22 / liq: 347690241655 / tokens: 0 + 189.9
tick: -35328 ~ -35264 / price: 29.22 ~ 29.41 / liq: 353324818189 / tokens: 0 + 193.5
tick: -35264 ~ -35200 / price: 29.41 ~ 29.6 / liq: 382267768396 / tokens: 0 + 210.1
tick: -35200 ~ -35136 / price: 29.6 ~ 29.79 / liq: 398644060522 / tokens: 0 + 219.8
tick: -35136 ~ -35072 / price: 29.79 ~ 29.98 / liq: 437620494398 / tokens: 0 + 242
tick: -35072 ~ -35008 / price: 29.98 ~ 30.17 / liq: 457865805760 / tokens: 0 + 254.1
tick: -35008 ~ -34944 / price: 30.17 ~ 30.37 / liq: 518152671810 / tokens: 0 + 288.4
tick: -34944 ~ -34880 / price: 30.37 ~ 30.56 / liq: 518571492208 / tokens: 0 + 289.6
tick: -34880 ~ -34816 / price: 30.56 ~ 30.76 / liq: 950348682697 / tokens: 0 + 532.5
tick: -34816 ~ -34752 / price: 30.76 ~ 30.96 / liq: 1162231389107 / tokens: 0 + 653.3
tick: -34752 ~ -34688 / price: 30.96 ~ 31.15 / liq: 1149552711840 / tokens: 0 + 648.2
tick: -34688 ~ -34624 / price: 31.15 ~ 31.35 / liq: 1149611442785 / tokens: 0 + 650.3
tick: -34624 ~ -34560 / price: 31.35 ~ 31.56 / liq: 1150150136462 / tokens: 0 + 652.7
tick: -34560 ~ -34496 / price: 31.56 ~ 31.76 / liq: 1470301857855 / tokens: 0 + 837.1
tick: -34496 ~ -34432 / price: 31.76 ~ 31.96 / liq: 1467433692697 / tokens: 0 + 838.2
tick: -34432 ~ -34368 / price: 31.96 ~ 32.17 / liq: 1420433353051 / tokens: 0 + 813.9
tick: -34368 ~ -34304 / price: 32.17 ~ 32.37 / liq: 1490596855512 / tokens: 0 + 856.8
tick: -34304 ~ -34240 / price: 32.37 ~ 32.58 / liq: 1490974878145 / tokens: 0 + 859.8
tick: -34240 ~ -34176 / price: 32.58 ~ 32.79 / liq: 1492651546536 / tokens: 0 + 863.5
tick: -34176 ~ -34112 / price: 32.79 ~ 33 / liq: 1508108260315 / tokens: 0 + 875.3
tick: -34112 ~ -34048 / price: 33 ~ 33.21 / liq: 1546697658426 / tokens: 0 + 900.6
tick: -34048 ~ -33984 / price: 33.21 ~ 33.43 / liq: 1595286445112 / tokens: 0 + 931.8
tick: -33984 ~ -33920 / price: 33.43 ~ 33.64 / liq: 1581977823002 / tokens: 0 + 927
tick: -33920 ~ -33856 / price: 33.64 ~ 33.86 / liq: 1576766221503 / tokens: 0 + 926.9
tick: -33856 ~ -33792 / price: 33.86 ~ 34.08 / liq: 1576737873536 / tokens: 0 + 929.9
tick: -33792 ~ -33728 / price: 34.08 ~ 34.29 / liq: 1540488527007 / tokens: 0 + 911.4
tick: -33728 ~ -33664 / price: 34.29 ~ 34.51 / liq: 1540488524641 / tokens: 0 + 914.3
tick: -33664 ~ -33600 / price: 34.51 ~ 34.74 / liq: 1539989248918 / tokens: 0 + 917
tick: -33600 ~ -33536 / price: 34.74 ~ 34.96 / liq: 1547336009731 / tokens: 0 + 924.3
tick: -33536 ~ -33472 / price: 34.96 ~ 35.18 / liq: 1565500990919 / tokens: 0 + 938.1
tick: -33472 ~ -33408 / price: 35.18 ~ 35.41 / liq: 1925728202086 / tokens: 0 + 1157
tick: -33408 ~ -33280 / price: 35.41 ~ 35.87 / liq: 1911776411041 / tokens: 0 + 2309
tick: -33280 ~ -33216 / price: 35.87 ~ 36.1 / liq: 1911809701422 / tokens: 0 + 1160
tick: -33216 ~ -33152 / price: 36.1 ~ 36.33 / liq: 1885395079653 / tokens: 0 + 1148
tick: -33152 ~ -33088 / price: 36.33 ~ 36.56 / liq: 1857891158945 / tokens: 0 + 1134
tick: -33088 ~ -33024 / price: 36.56 ~ 36.8 / liq: 1854450483515 / tokens: 0 + 1136
tick: -33024 ~ -32960 / price: 36.8 ~ 37.03 / liq: 1834690974453 / tokens: 0 + 1128
tick: -32960 ~ -32896 / price: 37.03 ~ 37.27 / liq: 1830733185923 / tokens: 0 + 1129
tick: -32896 ~ -32832 / price: 37.27 ~ 37.51 / liq: 1830690900042 / tokens: 0 + 1132
tick: -32832 ~ -32768 / price: 37.51 ~ 37.75 / liq: 1395845333152 / tokens: 0 + 866.4
tick: -32768 ~ -32704 / price: 37.75 ~ 37.99 / liq: 1390978146383 / tokens: 0 + 866.2
tick: -32704 ~ -32640 / price: 37.99 ~ 38.24 / liq: 1344263178566 / tokens: 0 + 839.8
tick: -32640 ~ -32576 / price: 38.24 ~ 38.48 / liq: 1314217312767 / tokens: 0 + 823.6
tick: -32576 ~ -32512 / price: 38.48 ~ 38.73 / liq: 1386379205783 / tokens: 0 + 871.6
tick: -32512 ~ -32384 / price: 38.73 ~ 39.23 / liq: 1332036344202 / tokens: 0 + 1683
tick: -32384 ~ -32320 / price: 39.23 ~ 39.48 / liq: 1343127084462 / tokens: 0 + 852.6
tick: -32320 ~ -32256 / price: 39.48 ~ 39.73 / liq: 1341280708423 / tokens: 0 + 854.1
tick: -32256 ~ -32192 / price: 39.73 ~ 39.99 / liq: 1341269975636 / tokens: 0 + 856.9
tick: -32192 ~ -32128 / price: 39.99 ~ 40.25 / liq: 1559305749007 / tokens: 0 + 999.4
tick: -32128 ~ -32064 / price: 40.25 ~ 40.5 / liq: 1573858719882 / tokens: 0 + 1011
tick: -32064 ~ -32000 / price: 40.5 ~ 40.76 / liq: 1576902580608 / tokens: 0 + 1017
tick: -32000 ~ -31936 / price: 40.76 ~ 41.03 / liq: 1579392118336 / tokens: 0 + 1022
tick: -31936 ~ -31872 / price: 41.03 ~ 41.29 / liq: 1579268122591 / tokens: 0 + 1025
tick: -31872 ~ -31808 / price: 41.29 ~ 41.55 / liq: 1592896665121 / tokens: 0 + 1037
tick: -31808 ~ -31744 / price: 41.55 ~ 41.82 / liq: 1592896342888 / tokens: 0 + 1040
tick: -31744 ~ -31680 / price: 41.82 ~ 42.09 / liq: 1581740240012 / tokens: 0 + 1036
tick: -31680 ~ -31552 / price: 42.09 ~ 42.63 / liq: 1581421969382 / tokens: 0 + 2083
tick: -31552 ~ -31488 / price: 42.63 ~ 42.91 / liq: 1575185939879 / tokens: 0 + 1042
tick: -31488 ~ -31424 / price: 42.91 ~ 43.18 / liq: 1730800704608 / tokens: 0 + 1149
tick: -31424 ~ -31360 / price: 43.18 ~ 43.46 / liq: 1741281164153 / tokens: 0 + 1159
tick: -31360 ~ -31296 / price: 43.46 ~ 43.74 / liq: 2068087878272 / tokens: 0 + 1381
tick: -31296 ~ -31232 / price: 43.74 ~ 44.02 / liq: 2065573094878 / tokens: 0 + 1384
tick: -31232 ~ -31168 / price: 44.02 ~ 44.3 / liq: 1738715023657 / tokens: 0 + 1169
tick: -31168 ~ -31104 / price: 44.3 ~ 44.59 / liq: 1606240515033 / tokens: 0 + 1083
tick: -31104 ~ -31040 / price: 44.59 ~ 44.87 / liq: 1289085073637 / tokens: 0 + 872.4
tick: -31040 ~ -30976 / price: 44.87 ~ 45.16 / liq: 1259351248484 / tokens: 0 + 855
tick: -30976 ~ -30912 / price: 45.16 ~ 45.45 / liq: 1261875045148 / tokens: 0 + 859.4
tick: -30912 ~ -30848 / price: 45.45 ~ 45.74 / liq: 1876116504018 / tokens: 0 + 1281
tick: -30848 ~ -30784 / price: 45.74 ~ 46.03 / liq: 1213373225714 / tokens: 0 + 831.7
tick: -30784 ~ -30656 / price: 46.03 ~ 46.63 / liq: 1203546184273 / tokens: 0 + 1657
tick: -30656 ~ -30592 / price: 46.63 ~ 46.93 / liq: 1195536363133 / tokens: 0 + 827.4
tick: -30592 ~ -30528 / price: 46.93 ~ 47.23 / liq: 1197048426173 / tokens: 0 + 831.1
tick: -30528 ~ -30464 / price: 47.23 ~ 47.53 / liq: 1197048537320 / tokens: 0 + 833.7
tick: -30464 ~ -30336 / price: 47.53 ~ 48.14 / liq: 1196922325889 / tokens: 0 + 1675
tick: -30336 ~ -30272 / price: 48.14 ~ 48.45 / liq: 1178590692556 / tokens: 0 + 828.8
tick: -30272 ~ -30208 / price: 48.45 ~ 48.76 / liq: 1178549213349 / tokens: 0 + 831.4
tick: -30208 ~ -30144 / price: 48.76 ~ 49.08 / liq: 1177944790265 / tokens: 0 + 833.7
tick: -30144 ~ -30080 / price: 49.08 ~ 49.39 / liq: 1012334846429 / tokens: 0 + 718.8
tick: -30080 ~ -29952 / price: 49.39 ~ 50.03 / liq: 1012334494851 / tokens: 0 + 1444
tick: -29952 ~ -29888 / price: 50.03 ~ 50.35 / liq: 587483449782 / tokens: 0 + 421.1
tick: -29888 ~ -29760 / price: 50.35 ~ 51 / liq: 587483317702 / tokens: 0 + 846.3
tick: -29760 ~ -29632 / price: 51 ~ 51.66 / liq: 569960567025 / tokens: 0 + 826.4
tick: -29632 ~ -29440 / price: 51.66 ~ 52.66 / liq: 338811617333 / tokens: 0 + 742.8
tick: -29440 ~ -29376 / price: 52.66 ~ 53 / liq: 333307460840 / tokens: 0 + 245.1
tick: -29376 ~ -29312 / price: 53 ~ 53.34 / liq: 333307565987 / tokens: 0 + 245.9
tick: -29312 ~ -29120 / price: 53.34 ~ 54.37 / liq: 334685512160 / tokens: 0 + 745.5
tick: -29120 ~ -28800 / price: 54.37 ~ 56.14 / liq: 331988370293 / tokens: 0 + 1248
tick: -28800 ~ -28736 / price: 56.14 ~ 56.5 / liq: 278642200497 / tokens: 0 + 211.6
tick: -28736 ~ -28608 / price: 56.5 ~ 57.23 / liq: 278597571337 / tokens: 0 + 425.1
tick: -28608 ~ -28544 / price: 57.23 ~ 57.59 / liq: 272870283300 / tokens: 0 + 209.2
tick: -28544 ~ -28480 / price: 57.59 ~ 57.96 / liq: 236662800744 / tokens: 0 + 182
tick: -28480 ~ -28416 / price: 57.96 ~ 58.34 / liq: 261048051974 / tokens: 0 + 201.4
tick: -28416 ~ -28352 / price: 58.34 ~ 58.71 / liq: 224554058215 / tokens: 0 + 173.8
tick: -28352 ~ -28288 / price: 58.71 ~ 59.09 / liq: 229140404094 / tokens: 0 + 177.9
tick: -28288 ~ -28224 / price: 59.09 ~ 59.47 / liq: 224072078398 / tokens: 0 + 174.5
tick: -28224 ~ -27776 / price: 59.47 ~ 62.19 / liq: 222560015358 / tokens: 0 + 1229
tick: -27776 ~ -27712 / price: 62.19 ~ 62.59 / liq: 221125037278 / tokens: 0 + 176.7
tick: -27712 ~ -27648 / price: 62.59 ~ 62.99 / liq: 221128293001 / tokens: 0 + 177.3
tick: -27648 ~ -27392 / price: 62.99 ~ 64.63 / liq: 218311939289 / tokens: 0 + 705.8
tick: -27392 ~ -27328 / price: 64.63 ~ 65.04 / liq: 215846497768 / tokens: 0 + 175.8
tick: -27328 ~ -27200 / price: 65.04 ~ 65.88 / liq: 215678758490 / tokens: 0 + 353.1
tick: -27200 ~ -27136 / price: 65.88 ~ 66.3 / liq: 216018428181 / tokens: 0 + 177.7
tick: -27136 ~ -27008 / price: 66.3 ~ 67.16 / liq: 215474391709 / tokens: 0 + 356.2
tick: -27008 ~ -26880 / price: 67.16 ~ 68.02 / liq: 220940066908 / tokens: 0 + 367.6
tick: -26880 ~ -26816 / price: 68.02 ~ 68.46 / liq: 222371752523 / tokens: 0 + 185.8
tick: -26816 ~ -26560 / price: 68.46 ~ 70.23 / liq: 222813758438 / tokens: 0 + 750.9
tick: -26560 ~ -26496 / price: 70.23 ~ 70.68 / liq: 241078598315 / tokens: 0 + 204.7
tick: -26496 ~ -26432 / price: 70.68 ~ 71.14 / liq: 239681550690 / tokens: 0 + 204.2
tick: -26432 ~ -26304 / price: 71.14 ~ 72.05 / liq: 254062518745 / tokens: 0 + 435
tick: -26304 ~ -26240 / price: 72.05 ~ 72.52 / liq: 254819589196 / tokens: 0 + 219.2
tick: -26240 ~ -26176 / price: 72.52 ~ 72.98 / liq: 268076531449 / tokens: 0 + 231.3
tick: -26176 ~ -26112 / price: 72.98 ~ 73.45 / liq: 270165006305 / tokens: 0 + 233.9
tick: -26112 ~ -26048 / price: 73.45 ~ 73.92 / liq: 278641778926 / tokens: 0 + 242
tick: -26048 ~ -25984 / price: 73.92 ~ 74.4 / liq: 270487942102 / tokens: 0 + 235.7
tick: -25984 ~ -25920 / price: 74.4 ~ 74.87 / liq: 275993288656 / tokens: 0 + 241.2
tick: -25920 ~ -25856 / price: 74.87 ~ 75.36 / liq: 289074968275 / tokens: 0 + 253.5
tick: -25856 ~ -25728 / price: 75.36 ~ 76.33 / liq: 286303868228 / tokens: 0 + 504.6
tick: -25728 ~ -25536 / price: 76.33 ~ 77.81 / liq: 285546797777 / tokens: 0 + 760.9
tick: -25536 ~ -25472 / price: 77.81 ~ 78.31 / liq: 319918168128 / tokens: 0 + 286
tick: -25472 ~ -25344 / price: 78.31 ~ 79.31 / liq: 320722726099 / tokens: 0 + 576.2
tick: -25344 ~ -25280 / price: 79.31 ~ 79.82 / liq: 349954898035 / tokens: 0 + 315.8
tick: -25280 ~ -25216 / price: 79.82 ~ 80.34 / liq: 358690875152 / tokens: 0 + 324.8
tick: -25216 ~ -25152 / price: 80.34 ~ 80.85 / liq: 359171921263 / tokens: 0 + 326.2
tick: -25152 ~ -25088 / price: 80.85 ~ 81.37 / liq: 347436381227 / tokens: 0 + 316.6
tick: -25088 ~ -25024 / price: 81.37 ~ 81.89 / liq: 347439169792 / tokens: 0 + 317.6
tick: -25024 ~ -24960 / price: 81.89 ~ 82.42 / liq: 347441970220 / tokens: 0 + 318.6
tick: -24960 ~ -24896 / price: 82.42 ~ 82.95 / liq: 334792259026 / tokens: 0 + 308
tick: -24896 ~ -24832 / price: 82.95 ~ 83.48 / liq: 334796025052 / tokens: 0 + 309
tick: -24832 ~ -24768 / price: 83.48 ~ 84.02 / liq: 334793236487 / tokens: 0 + 310
tick: -24768 ~ -24640 / price: 84.02 ~ 85.1 / liq: 402036387998 / tokens: 0 + 748.1
tick: -24640 ~ -24512 / price: 85.1 ~ 86.2 / liq: 397726477075 / tokens: 0 + 744.9
tick: -24512 ~ -24448 / price: 86.2 ~ 86.75 / liq: 397726525992 / tokens: 0 + 374.2
tick: -24448 ~ -24384 / price: 86.75 ~ 87.31 / liq: 4444291249321 / tokens: 0 + 4195
tick: -24384 ~ -24320 / price: 87.31 ~ 87.87 / liq: 4725476006602 / tokens: 0 + 4475
tick: -24320 ~ -24256 / price: 87.87 ~ 88.43 / liq: 4760314440879 / tokens: 0 + 4522
tick: -24256 ~ -24192 / price: 88.43 ~ 89 / liq: 4803295384062 / tokens: 0 + 4578
tick: -24192 ~ -24128 / price: 89 ~ 89.57 / liq: 4808850140716 / tokens: 0 + 4597
tick: -24128 ~ -24064 / price: 89.57 ~ 90.15 / liq: 4812324278049 / tokens: 0.1456 + 4602
tick: -24064 ~ -24000 / price: 90.15 ~ 90.72 / liq: 4741956421765 / tokens: 50.45 + 0
tick: -24000 ~ -23936 / price: 90.72 ~ 91.31 / liq: 4737173661680 / tokens: 50.24 + 0
tick: -23936 ~ -23872 / price: 91.31 ~ 91.89 / liq: 4708787288856 / tokens: 49.78 + 0
tick: -23872 ~ -23808 / price: 91.89 ~ 92.48 / liq: 4737658413341 / tokens: 49.92 + 0
tick: -23808 ~ -23680 / price: 92.48 ~ 93.67 / liq: 4778132764144 / tokens: 100.2 + 0
tick: -23680 ~ -23552 / price: 93.67 ~ 94.88 / liq: 4769640662852 / tokens: 99.41 + 0
tick: -23552 ~ -23424 / price: 94.88 ~ 96.1 / liq: 4769742412434 / tokens: 98.77 + 0
tick: -23424 ~ -23296 / price: 96.1 ~ 97.34 / liq: 4772457483778 / tokens: 98.2 + 0
tick: -23296 ~ -23232 / price: 97.34 ~ 97.97 / liq: 4743586359293 / tokens: 48.57 + 0
tick: -23232 ~ -23168 / price: 97.97 ~ 98.59 / liq: 4741567702002 / tokens: 48.39 + 0
tick: -23168 ~ -23104 / price: 98.59 ~ 99.23 / liq: 6451183636119 / tokens: 65.63 + 0
tick: -23104 ~ -23040 / price: 99.23 ~ 99.87 / liq: 9768518015187 / tokens: 99.06 + 0
tick: -23040 ~ -22976 / price: 99.87 ~ 100.5 / liq: 9762586833015 / tokens: 98.69 + 0
tick: -22976 ~ -22912 / price: 100.5 ~ 101.1 / liq: 9754945126490 / tokens: 98.29 + 0
tick: -22912 ~ -22848 / price: 101.1 ~ 101.8 / liq: 9722461021058 / tokens: 97.65 + 0
tick: -22848 ~ -22720 / price: 101.8 ~ 103.1 / liq: 9726151294007 / tokens: 194.4 + 0
tick: -22720 ~ -22656 / price: 103.1 ~ 103.7 / liq: 8017063158965 / tokens: 79.75 + 0
tick: -22656 ~ -22592 / price: 103.7 ~ 104.4 / liq: 3968004890867 / tokens: 39.35 + 0
tick: -22592 ~ -22528 / price: 104.4 ~ 105.1 / liq: 3975916350875 / tokens: 39.3 + 0
tick: -22528 ~ -22400 / price: 105.1 ~ 106.4 / liq: 3941077916598 / tokens: 77.54 + 0
tick: -22400 ~ -22272 / price: 106.4 ~ 107.8 / liq: 3940976167016 / tokens: 77.04 + 0
tick: -22272 ~ -22016 / price: 107.8 ~ 110.6 / liq: 3940901204548 / tokens: 152.6 + 0
tick: -22016 ~ -21952 / price: 110.6 ~ 111.3 / liq: 3651892299742 / tokens: 35.07 + 0
tick: -21952 ~ -21888 / price: 111.3 ~ 112 / liq: 275563201128 / tokens: 2.638 + 0
tick: -21888 ~ -21824 / price: 112 ~ 112.7 / liq: 268209110183 / tokens: 2.559 + 0
tick: -21824 ~ -21760 / price: 112.7 ~ 113.5 / liq: 268062597723 / tokens: 2.55 + 0
tick: -21760 ~ -21696 / price: 113.5 ~ 114.2 / liq: 239842802224 / tokens: 2.274 + 0
tick: -21696 ~ -21568 / price: 114.2 ~ 115.7 / liq: 200986047417 / tokens: 3.793 + 0
tick: -21568 ~ -21376 / price: 115.7 ~ 117.9 / liq: 199920087844 / tokens: 5.614 + 0
tick: -21376 ~ -21184 / price: 117.9 ~ 120.2 / liq: 197248514050 / tokens: 5.486 + 0
tick: -21184 ~ -20992 / price: 120.2 ~ 122.5 / liq: 187311128937 / tokens: 5.16 + 0
tick: -20992 ~ -20928 / price: 122.5 ~ 123.3 / liq: 141027264505 / tokens: 1.286 + 0
tick: -20928 ~ -20800 / price: 123.3 ~ 124.9 / liq: 140932406485 / tokens: 2.559 + 0
tick: -20800 ~ -20608 / price: 124.9 ~ 127.3 / liq: 140876927999 / tokens: 3.807 + 0
tick: -20608 ~ -20544 / price: 127.3 ~ 128.1 / liq: 143295834946 / tokens: 1.282 + 0
tick: -20544 ~ -20480 / price: 128.1 ~ 129 / liq: 138420803113 / tokens: 1.235 + 0
tick: -20480 ~ -20416 / price: 129 ~ 129.8 / liq: 124582096266 / tokens: 1.108 + 0
tick: -20416 ~ -20288 / price: 129.8 ~ 131.5 / liq: 121107008370 / tokens: 2.144 + 0
tick: -20288 ~ -20160 / price: 131.5 ~ 133.2 / liq: 118755077105 / tokens: 2.089 + 0
tick: -20160 ~ -19776 / price: 133.2 ~ 138.4 / liq: 57936148493 / tokens: 3.018 + 0
tick: -19776 ~ -19200 / price: 138.4 ~ 146.6 / liq: 56554752692 / tokens: 4.315 + 0
tick: -19200 ~ -18944 / price: 146.6 ~ 150.4 / liq: 49657391878 / tokens: 1.649 + 0
tick: -18944 ~ -18176 / price: 150.4 ~ 162.4 / liq: 49129592803 / tokens: 4.771 + 0
tick: -18176 ~ -18112 / price: 162.4 ~ 163.4 / liq: 47790022613 / tokens: 0.3788 + 0
tick: -18112 ~ -18048 / price: 163.4 ~ 164.5 / liq: 39835166970 / tokens: 0.3147 + 0
tick: -18048 ~ -17920 / price: 164.5 ~ 166.6 / liq: 35609679418 / tokens: 0.56 + 0
tick: -17920 ~ -17856 / price: 166.6 ~ 167.7 / liq: 34692199152 / tokens: 0.2715 + 0
tick: -17856 ~ -17728 / price: 167.7 ~ 169.8 / liq: 33857910661 / tokens: 0.5274 + 0
tick: -17728 ~ -16640 / price: 169.8 ~ 189.3 / liq: 23833834511 / tokens: 3.061 + 0
tick: -16640 ~ -16448 / price: 189.3 ~ 193 / liq: 21414816417 / tokens: 0.4701 + 0
tick: -16448 ~ -16064 / price: 193 ~ 200.6 / liq: 21381540943 / tokens: 0.9253 + 0
tick: -16064 ~ -15488 / price: 200.6 ~ 212.5 / liq: 21626877837 / tokens: 1.37 + 0
tick: -15488 ~ -13824 / price: 212.5 ~ 250.9 / liq: 21626772690 / tokens: 3.745 + 0
tick: -13824 ~ -12032 / price: 250.9 ~ 300.2 / liq: 16168802932 / tokens: 2.765 + 0
tick: -12032 ~ -10752 / price: 300.2 ~ 341.2 / liq: 15923466038 / tokens: 1.801 + 0
tick: -10752 ~ 13440 / price: 341.2 ~ 3834 / liq: 15569202956 / tokens: 18.7 + 0
tick: 13440 ~ 26240 / price: 3834 ~ 13780 / liq: 15567309186 / tokens: 3.758 + 0
tick: 26240 ~ 29248 / price: 13780 ~ 18620 / liq: 15586319459 / tokens: 0.586 + 0
tick: 29248 ~ 36800 / price: 18620 ~ 39630 / liq: 15692452272 / tokens: 1.143 + 0
tick: 36800 ~ 138112 / price: 39630 ~ 995000000 / liq: 15567309186 / tokens: 2.456 + 0
tick: 138112 ~ 443584 / price: 995000000 ~ 18350000000000000000000 / liq: 15565769178 / tokens: 0.0156 + 0
amount_a_sum 1950.631
amount_b_sum 166913.21

*/