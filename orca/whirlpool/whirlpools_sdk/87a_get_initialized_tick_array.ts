import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import {
    WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG, buildWhirlpoolClient,
    PDAUtil, PriceMath, TickUtil
} from "@orca-so/whirlpools-sdk";
import { Wallet } from "@project-serum/anchor";

const RPC_ENDPOINT_URL="https://ssc-dao.genesysgo.net"

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL);
  console.log("connection endpoint", connection.rpcEndpoint);
  
  const dummy_wallet = new Wallet(Keypair.generate());
  const ctx = WhirlpoolContext.from(connection, dummy_wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const fetcher = new AccountFetcher(ctx.connection);
  const client = buildWhirlpoolClient(ctx);

  // famous tokens
  const SOL = {mint: new PublicKey("So11111111111111111111111111111111111111112"), decimals: 9};
  const ORCA = {mint: new PublicKey("orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE"), decimals: 6};
  const WBTC = {mint: new PublicKey("9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E"), decimals: 6};
  const WETH = {mint: new PublicKey("7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs"), decimals: 8};
  const MSOL = {mint: new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"), decimals: 9};
  const MNDE = {mint: new PublicKey("MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey"), decimals: 9};
  const USDC = {mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), decimals: 6};
  const TICK_SPACING_STABLE = 1;
  const TICK_SPACING_STANDARD = 64;

  // select input
  // The list of Orca UI supported whirlpools. (it contains tokenMintA, tokenMintB and tickSpacing)
  // https://orca-so.gitbook.io/orca-developer-portal/whirlpools/interacting-with-the-protocol/orca-whirlpools-parameters#orca-ui-supported-whirlpools
  const token_a = WBTC;
  const token_b = USDC;
  const tick_spacing = TICK_SPACING_STANDARD;

  // get whirlpool
  const whirlpool_key = PDAUtil.getWhirlpool(
    ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG,
    token_a.mint, token_b.mint, tick_spacing).publicKey;
  console.log("whirlpool_key", whirlpool_key.toBase58());
  const whirlpool = client.getPool(whirlpool_key);
  const whirlpool_data = (await whirlpool).getData();
  console.log("current_tick_index", whirlpool_data.tickCurrentIndex);

  const current_tickarray_start_index = TickUtil.getStartTickIndex(whirlpool_data.tickCurrentIndex, tick_spacing);

  // -49 to +50 tickarrays
  const tickarray_start_indexes: number[] = [];
  const tickarray_pubkeys: PublicKey[] = [];
  for ( let offset=-49; offset<=50; offset++ ) {
    const start_tick_index = TickUtil.getStartTickIndex(whirlpool_data.tickCurrentIndex, tick_spacing, offset);
    const pda = PDAUtil.getTickArrayFromTickIndex(start_tick_index, tick_spacing, whirlpool_key, ORCA_WHIRLPOOL_PROGRAM_ID);
    tickarray_start_indexes.push(start_tick_index);
    tickarray_pubkeys.push(pda.publicKey);
  }

  // get tickarrays
  const tickarrays = await fetcher.listTickArrays(tickarray_pubkeys, true);

  // print tickarrays
  let lower_bound = 0;
  let upper_bound = tickarrays.length - 1;
  while ( lower_bound < tickarrays.length && tickarrays[lower_bound] === null ) lower_bound++;
  while ( 0 <= upper_bound && tickarrays[upper_bound] === null ) upper_bound--;

  console.log("\nNeighbor TickArrays");
  for ( let i=lower_bound; i<=upper_bound; i++ ) {
    const pubkey = tickarray_pubkeys[i];
    const state = tickarrays[i] === null ? "    " : "init";
    const start_tick_index = tickarray_start_indexes[i];
    const price = PriceMath.tickIndexToPrice(start_tick_index, token_a.decimals, token_b.decimals).toFixed(token_b.decimals);

    console.log(
      start_tick_index == current_tickarray_start_index ? "*" : " ",
      pubkey.toBase58().padEnd(45, " "),
      state,
      start_tick_index.toString().padStart(10, " "),
      price.toString()
    );
  }
}

main();

/*

SAMPLE OUTPUT(SOL/USDC):

$ ts-node src/87a_get_initialized_tick_array.ts 
connection endpoint https://ssc-dao.genesysgo.net
whirlpool_key HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
current_tick_index -31616

Neighbor TickArrays
  6TsdYNM9AJ7ojimov6nFUccaJ2EGMu9Aaagfb2Eryeec  INIT    -140800 0.000768
  HH8aRWvbX1CnWB8bT6iPhkhGqhaYb3kDGGvpLJHcFj3i  ----    -135168 0.001349
  GiBTzHYwyfszYAzAr28R6SLCH7Gm2VjPP1VbzpXmhoRf  ----    -129536 0.002369
  2BGxrvw1ezQKj3ZiMRYMR6JYzvL3pZzBJp57jsiZb7GH  ----    -123904 0.004160
  7qUK2Qy5DwuJ9AZhcLdkpY3ithFDbs8g587TETZbJ82z  INIT    -118272 0.007307
  FKk4Uzwrs2MLDDgDhDrTivpMtFNKGa3sZe9QxUniQEAm  ----    -112640 0.012833
  Gdzrd5P9q6P1Ee51389L3NHCn4fsbqrAV9azGFYwCuba  ----    -107008 0.022538
  DNZVrLgyFSoDBMnfvEC34cDzmcTCR6uYsB4L3Fv3Fpss  ----    -101376 0.039583
  8oJofFVP5eHfsKf7A6gWMRVhJHxryPCcTBJSHEGNnEJX  INIT     -95744 0.069518
  6t6TVkAZ4wb3Krugv9NYC51wvhUnXooy5NKpt1KX5ouY  ----     -90112 0.122090
  9Y7BjdgZetK4i5o74n8dzkooYwrsoszhtKDGKs528auX  ----     -84480 0.214419
  HaSNHCr7DADSmqgWTjjeHsP422B5ENU33mDYGimVp27D  INIT     -78848 0.376570
  HRpjt1jzUdraArTQgYrBqdcQvBFL2ZW77ADFtsWJb9uz  ----     -73216 0.661345
  5tjpgnLtHF9he72J4ARqrrbwDT4X9PuDjn977XZr5cpe  INIT     -67584 1.161477
  F1SHK9p6e3ewt2cdtfDS9fdyyo5MheU1K9HBErPFLC2   INIT     -61952 2.039827
  GFjooyCeutGRpUjcdWCgNpQJMkqdGedkj7jLBomHAQfo  INIT     -56320 3.582413
  93a168GhU5TKPri9jdkjysXhfb13z1BqGh5miGs2Pq6a  INIT     -50688 6.291557
  C8o6QPGfuJD9XmNQY9ZTMXJE5qSDv4LHXaRA3D26GQ4M  INIT     -45056 11.049448
  EVqGhR2ukNuqZNfvFFAitrX6UqrRm2r8ayKX9LH9xHzK  INIT     -39424 19.405419
* 2Eh8HEeu45tCWxY6ruLLRN6VcTSD7bfshGj7bZA87Kne  INIT     -33792 34.080460
  A2W6hiA2nf16iqtbZt9vX8FJbiXjv3DBUG3DgTja61HT  INIT     -28160 59.853270
  CEstjhG1v4nUgvGDyFruYEbJ18X8XeN4sX1WFCLt4D5c  INIT     -22528 105.116358
  HoDhUt77EotPNLUfJuvCCLbmpiM1JR6WLqWxeDPR1xvK  INIT     -16896 184.608940
  81T5kNuPRkyVzhwbe2RpKR7wmQpGJ7RBkGPdTqyfa5vq  INIT     -11264 324.216530
  9K1HWrGKZKfjTnKfF621BmEQdai4FcUz9tsoF41jwz5B  INIT      -5632 569.400149
  JCpxMSDRDPBMqjoX7LkhMwro2y6r85Q8E6p5zNdBZyWa  INIT          0 999.999999
  BW2Mr823NUQN7vnVpv5E6yCTnqEXQ3ZnqjZyiywXPcUp  INIT       5632 1756.234172
  2ezvsnoXdukw5dAAZ4EkW67bmUo8PHRPX8ZDqf76BKtV  INIT      11264 3084.358468
  F9N7X6aYehQYPrebHj3idDg31XpJvcoAwwbKR32o2xy9  INIT      16896 5416.855741
  Be66q2LKA6Ab8V6h4ttxs63NUG3xvTeVLzZjw4Cocf1F  INIT      22528 9513.267160
  ErXNg7Y3oXJjQTNGEornxFJTpob4WBfvPkBWuAkzHUmF  INIT      28160 16707.524877
  7t74AQGjawmMUkkfCn7rbBYNpBgtPPcb7ExsuTTBuF3i  INIT      33792 29342.326124
  3LMFYB2rdS7MYKSgYyg3cXknXvuhMnFPNyWLNye4Znvf  INIT      39424 51531.995836
  5hzpPuHY8mu7QPRcHB2QBreSUnabBLknGS6P8YmaEt8S  INIT      45056 90502.252058
  FNbHKtAoVNLtmW51rMEym46gZ6UJjxjqewEMXjsRYJdb  INIT      50688 158943.147739
  5R3ggvauMuSigwM9aN2KF2EmA9MoU9qjqVS8Bq2re8Sc  INIT      56320 279141.387522
  3oV7oz4vUeWQWs8erG11jnEv15Z1uPY8fshegSHbjzw2  INIT      61952 490237.643685
  Gewgtj41E1Zo1FdXXpEu3YFoPhw8XtBzDKY9FuKhu2JX  INIT      67584 860972.102414
  9aruDn77Jhwa3DoU2bPXrUR9bZxfwp7CRLm34U5ZPtCs  INIT      73216 1512068.627705
  FbeV1kXR73AzXmpeMM5xYN98fyEZw8V52QymUu9V62CF  INIT      78848 2655546.594922
  93Wmk4AM7fokrhR6oWNLWE9WnfNCgeZr9Fz6UAVV2jTi  INIT      84480 4663761.676284
  Da2A9K7FdfKtBJGUjCxGfQ61oyGVR8ksmksxctqRHCvv  INIT      90112 8190657.627610
  HagiaTJouPyeEGAXyv567Yk1aftqo9RKGFGfaNAGLYfr  INIT      95744 14384712.819671

SAMPLE OUTPUT(WBTC/USDC):

whirlpool_key ErSQss3jrqDpQoLEYvo6onzjsi6zm4Sjpoz1pjqz2o6D
current_tick_index 100815

Neighbor TickArrays
  9JsCu4X5dMkuQY61AYeQq1S6ELvB2gdAHWyXeJUF5Mxe  init      78848 2655.546594
  ANYaVA5z5oQKCSsvhuzaNZdAQu34txodWTNS8asEHvxL  init      84480 4663.761676
  99h594kgdjiNF8R3scZWVNGBoxzk6RmvQ5EVjHPtoJwy  init      90112 8190.657627
* 6woia9bZp9TFdvNQXftisZRYmwsBDLi67ScBgVrNs5uh  init      95744 14384.712819
  35NdvzGPG94HfBNwtLHiziXy6HtW5EQHsMxWyyx8Mdf1  init     101376 25262.924213
  GY6tHbJiEKbxqTq5RPsLqC7nFF9WxwAXCEuPdJR2aKRA  init     107008 44367.610797
  CHzPUQkMvT2T6mCiF9BpqafhL1PSWzBg2ybXMTPrYXbD  init     112640 77919.914227

*/