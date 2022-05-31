import { Connection, KeyedAccountInfo, DataSizeFilter, MemcmpFilter, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, AccountLayout } from '@solana/spl-token';
import { OrcaPoolConfig, deserializeAccount } from '@orca-so/sdk';
import { orcaPoolConfigs } from '@orca-so/sdk/dist/constants';

/************************************************************************************
* ATTENTION!!!!! 
* THIS SCRIPT MAY RECEIVE MASSIVE AMOUNT OF DATA
*************************************************************************************/

// NO OPERATION: avoid import error of Percentage class
orcaPoolConfigs[OrcaPoolConfig.SOL_USDC];

// GLOBAL STATE
const publickey_to_pool_info_map = new Map<string, string>();

function orca_pool_deposit_listener(keyed_account_info: KeyedAccountInfo) {
  const what_account = publickey_to_pool_info_map.get(keyed_account_info.accountId.toBase58());
  const parsed = deserializeAccount(keyed_account_info.accountInfo.data);

  console.log(`CHANGE DETECTED! account: ${what_account}, amount: ${parsed.amount.toString()}`);
}

function token_account_listener(keyed_account_info: KeyedAccountInfo) {
  if ( publickey_to_pool_info_map.has(keyed_account_info.accountId.toBase58()) ) {
    // call if the account is deposit account of Orca's pool
    orca_pool_deposit_listener(keyed_account_info);
  }
}

async function main() {
  const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net";

  // build Orca's pool pubkey map
  const configs = Object.values(orcaPoolConfigs);
  configs.map((config) => {
    const token_a = config.tokens[config.tokenIds[0]];
    const token_b = config.tokens[config.tokenIds[1]];
    const pool_name = `${token_a.tag}/${token_b.tag}`;

    publickey_to_pool_info_map.set(token_a.addr.toBase58(), `${token_a.tag} deposit of ${pool_name}`);
    publickey_to_pool_info_map.set(token_b.addr.toBase58(), `${token_b.tag} deposit of ${pool_name}`);
  });
  //console.log(publickey_to_pool_info_map);

  // connection
  const commitment = 'processed';
  const connection = new Connection(RPC_ENDPOINT_URL, { commitment: commitment });

  const size_filter: DataSizeFilter = { dataSize: AccountLayout.span };
  const filters = [size_filter, /* NO memcmp_filter */];

  // register listners to detect ALL TokenAccount
  console.log("start listening...");
  const token_account_listener_id = connection.onProgramAccountChange(TOKEN_PROGRAM_ID, token_account_listener, commitment, filters);

  // monitoring
  const monitoring_sec = 10;
  for (let i=0;i<monitoring_sec;i++) {
    console.log("MEMORY USAGE", process.memoryUsage().rss / 1024 / 1024, "MB");
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // unregister listeners
  console.log("stop listening...");
  connection.removeProgramAccountChangeListener(token_account_listener_id);
}

main();

/*
to monitor GC activity:

$ node --trace-gc -r ts-node/register ./src/monitor_all_orca_pool.ts 

OUTPUT SAMPLE:

$ ts-node ./src/monitor_all_orca_pool.ts 
start listening...
MEMORY USAGE 171.0390625 MB
CHANGE DETECTED! account: SHDW deposit of SHDW/USDC, amount: 4659179981809825
CHANGE DETECTED! account: SOL deposit of SOL/USDC, amount: 1545413175685471
MEMORY USAGE 180.203125 MB
CHANGE DETECTED! account: USDC deposit of BTC/USDC, amount: 781934277196
CHANGE DETECTED! account: USDC deposit of SOL/USDC, amount: 71976419216521
CHANGE DETECTED! account: USDC deposit of GST/USDC, amount: 8683757535535
CHANGE DETECTED! account: mSOL deposit of mSOL/USDC, amount: 13117396302424
CHANGE DETECTED! account: SAMO deposit of SAMO/USDC, amount: 200053411242968401
CHANGE DETECTED! account: BTC deposit of BTC/USDC, amount: 24352188
CHANGE DETECTED! account: USDC deposit of SHDW/USDC, amount: 3617225693555
CHANGE DETECTED! account: USDC deposit of mSOL/USDC, amount: 639714292947
CHANGE DETECTED! account: GST deposit of GST/USDC, amount: 7625083266693557
CHANGE DETECTED! account: USDC deposit of SAMO/USDC, amount: 1165050867797
CHANGE DETECTED! account: MEAN deposit of MEAN/USDC, amount: 1322365158643
CHANGE DETECTED! account: SOL deposit of SOL/USDC, amount: 1545413175685471
CHANGE DETECTED! account: USDC deposit of BTC/USDC, amount: 781934277196
CHANGE DETECTED! account: SHDW deposit of SHDW/USDC, amount: 4659179981809825
CHANGE DETECTED! account: USDC deposit of SHDW/USDC, amount: 3617225693555
CHANGE DETECTED! account: USDC deposit of GST/USDC, amount: 8683319215703
CHANGE DETECTED! account: USDC deposit of SOL/USDC, amount: 71976419216521
CHANGE DETECTED! account: BTC deposit of BTC/USDC, amount: 24352188
CHANGE DETECTED! account: GST deposit of GST/USDC, amount: 7625469326692986
CHANGE DETECTED! account: USDC deposit of MEAN/USDC, amount: 396204640251
MEMORY USAGE 182.484375 MB
CHANGE DETECTED! account: USDC deposit of SHDW/USDC, amount: 3617225693555
CHANGE DETECTED! account: USDC deposit of stSOL/USDC, amount: 754847811906
CHANGE DETECTED! account: USDC deposit of SOL/USDC, amount: 71976419216521
CHANGE DETECTED! account: USDC deposit of BTC/USDC, amount: 781934277196
CHANGE DETECTED! account: USDC deposit of GST/USDC, amount: 8683622040150
CHANGE DETECTED! account: GST deposit of GST/USDC, amount: 7625204818363505
CHANGE DETECTED! account: MEAN deposit of MEAN/USDC, amount: 1322376261138
CHANGE DETECTED! account: stSOL deposit of stSOL/USDC, amount: 15590128417562
CHANGE DETECTED! account: USDC deposit of MEAN/USDC, amount: 396201323749
CHANGE DETECTED! account: BTC deposit of BTC/USDC, amount: 24352188
CHANGE DETECTED! account: SHDW deposit of SHDW/USDC, amount: 4659179981809825
CHANGE DETECTED! account: SOL deposit of SOL/USDC, amount: 1545413175685471
CHANGE DETECTED! account: SHDW deposit of SHDW/USDC, amount: 4659179981809825
CHANGE DETECTED! account: USDC deposit of SAMO/USDC, amount: 1165050867797
CHANGE DETECTED! account: USDC deposit of GST/USDC, amount: 8683994188509
CHANGE DETECTED! account: USDC deposit of SOL/USDC, amount: 71976475607756
CHANGE DETECTED! account: AURY deposit of AURY/USDC, amount: 274409609073579
CHANGE DETECTED! account: GST deposit of GST/USDC, amount: 7624879323130671
CHANGE DETECTED! account: FTT deposit of FTT/USDC, amount: 2269091455
CHANGE DETECTED! account: SOL deposit of SOL/USDC, amount: 1545411968536679
CHANGE DETECTED! account: USDC deposit of SHDW/USDC, amount: 3617225693555
CHANGE DETECTED! account: USDC deposit of FTT/USDC, amount: 66179260983
CHANGE DETECTED! account: SAMO deposit of SAMO/USDC, amount: 200053411242968401
CHANGE DETECTED! account: USDC deposit of AURY/USDC, amount: 492519969529
MEMORY USAGE 182.8125 MB
CHANGE DETECTED! account: USDC deposit of GST/USDC, amount: 8683976041234
CHANGE DETECTED! account: GST deposit of GST/USDC, amount: 7624895392867676
CHANGE DETECTED! account: USDC deposit of stSOL/USDC, amount: 754847811906
CHANGE DETECTED! account: USDC deposit of AURY/USDC, amount: 492530699662
CHANGE DETECTED! account: SOL deposit of SOL/USDC, amount: 1545406244882434
CHANGE DETECTED! account: USDC deposit of SOL/USDC, amount: 71976743086801
CHANGE DETECTED! account: mSOL deposit of mSOL/USDC, amount: 13117396302424
CHANGE DETECTED! account: stSOL deposit of stSOL/USDC, amount: 15590128417562
CHANGE DETECTED! account: USDC deposit of mSOL/USDC, amount: 639714292947
CHANGE DETECTED! account: AURY deposit of AURY/USDC, amount: 274403648798311
CHANGE DETECTED! account: stSOL deposit of stSOL/USDC, amount: 15590128417562
CHANGE DETECTED! account: USDC deposit of SOL/USDC, amount: 71976509387111
CHANGE DETECTED! account: SOL deposit of SOL/USDC, amount: 1545411277742551
CHANGE DETECTED! account: USDC deposit of GST/USDC, amount: 8684293072513
CHANGE DETECTED! account: AURY deposit of AURY/USDC, amount: 274403648798311
CHANGE DETECTED! account: USDC deposit of AURY/USDC, amount: 492530699662
CHANGE DETECTED! account: USDC deposit of stSOL/USDC, amount: 754847811906
CHANGE DETECTED! account: GST deposit of GST/USDC, amount: 7624617975185963
MEMORY USAGE 183.1328125 MB
CHANGE DETECTED! account: SOL deposit of SOL/USDC, amount: 1545411277742551
CHANGE DETECTED! account: SHDW deposit of SHDW/USDC, amount: 4659179981809825
CHANGE DETECTED! account: USDC deposit of GST/USDC, amount: 8684429213943
CHANGE DETECTED! account: USDC deposit of SHDW/USDC, amount: 3617225693555
CHANGE DETECTED! account: USDC deposit of SOL/USDC, amount: 71976509387111
CHANGE DETECTED! account: GST deposit of GST/USDC, amount: 7624498962223760
CHANGE DETECTED! account: USDC deposit of mSOL/USDC, amount: 639714292947
CHANGE DETECTED! account: mSOL deposit of mSOL/USDC, amount: 13117396302424
MEMORY USAGE 183.26953125 MB
CHANGE DETECTED! account: whETH deposit of whETH/USDC, amount: 46273810059
CHANGE DETECTED! account: SOL deposit of SOL/USDC, amount: 1545411377742544
CHANGE DETECTED! account: USDC deposit of ETH/USDC, amount: 1131666701199
CHANGE DETECTED! account: FTT deposit of FTT/USDC, amount: 2269091455
CHANGE DETECTED! account: USDC deposit of GST/USDC, amount: 8684151684092
CHANGE DETECTED! account: USDC deposit of RUN/USDC, amount: 17347848475
CHANGE DETECTED! account: USDC deposit of SHDW/USDC, amount: 3617225693555
CHANGE DETECTED! account: GST deposit of GST/USDC, amount: 7624743964485780
CHANGE DETECTED! account: USDC deposit of whETH/USDC, amount: 922656003591
CHANGE DETECTED! account: ETH deposit of ETH/USDC, amount: 568352960
CHANGE DETECTED! account: USDC deposit of SOL/USDC, amount: 71976504743650
CHANGE DETECTED! account: SHDW deposit of SHDW/USDC, amount: 4659179981809825
CHANGE DETECTED! account: USDC deposit of BTC/USDC, amount: 781934277196
CHANGE DETECTED! account: USDC deposit of FTT/USDC, amount: 66179260983
CHANGE DETECTED! account: mSOL deposit of mSOL/USDC, amount: 13117396302424
CHANGE DETECTED! account: BTC deposit of BTC/USDC, amount: 24352188
CHANGE DETECTED! account: RUN deposit of RUN/USDC, amount: 1378438382424140
CHANGE DETECTED! account: USDC deposit of mSOL/USDC, amount: 639714292947
MEMORY USAGE 183.48828125 MB
CHANGE DETECTED! account: SOL deposit of RAY/SOL, amount: 215692585472
CHANGE DETECTED! account: FTT deposit of FTT/USDC, amount: 2269091455
CHANGE DETECTED! account: USDC deposit of SHDW/USDC, amount: 3617225693555
CHANGE DETECTED! account: USDC deposit of GST/USDC, amount: 8684092872785
CHANGE DETECTED! account: mSOL deposit of mSOL/USDT, amount: 148228274425810
CHANGE DETECTED! account: RAY deposit of RAY/SOL, amount: 9452168121
CHANGE DETECTED! account: USDC deposit of RUN/USDC, amount: 17305938278
CHANGE DETECTED! account: BTC deposit of BTC/USDC, amount: 24352188
CHANGE DETECTED! account: SHDW deposit of SHDW/USDC, amount: 4659179981809825
CHANGE DETECTED! account: SOL deposit of SOL/USDC, amount: 1545412607742534
CHANGE DETECTED! account: USDC deposit of whETH/USDC, amount: 922656003591
CHANGE DETECTED! account: whETH deposit of whETH/USDC, amount: 46273810059
CHANGE DETECTED! account: USDT deposit of mSOL/USDT, amount: 7235813329931
CHANGE DETECTED! account: mSOL deposit of mSOL/USDC, amount: 13117396302424
CHANGE DETECTED! account: USDC deposit of SOL/USDC, amount: 71976447629125
CHANGE DETECTED! account: GST deposit of GST/USDC, amount: 7624796056770638
CHANGE DETECTED! account: RUN deposit of RUN/USDC, amount: 1381786623739021
CHANGE DETECTED! account: USDC deposit of BTC/USDC, amount: 781934277196
CHANGE DETECTED! account: USDC deposit of mSOL/USDC, amount: 639714292947
CHANGE DETECTED! account: USDC deposit of FTT/USDC, amount: 66179260983
CHANGE DETECTED! account: USDC deposit of SHDW/USDC, amount: 3617225693555
CHANGE DETECTED! account: SOL deposit of SOL/USDC, amount: 1545391666578772
CHANGE DETECTED! account: USDC deposit of mSOL/USDC, amount: 639714292947
CHANGE DETECTED! account: GST deposit of GST/USDC, amount: 7624769535918737
CHANGE DETECTED! account: mSOL deposit of mSOL/USDC, amount: 13117396302424
CHANGE DETECTED! account: USDC deposit of whETH/USDC, amount: 922656003591
CHANGE DETECTED! account: USDC deposit of GST/USDC, amount: 8684124359537
CHANGE DETECTED! account: SHDW deposit of SHDW/USDC, amount: 4659179981809825
CHANGE DETECTED! account: whETH deposit of whETH/USDC, amount: 46273810059
CHANGE DETECTED! account: USDC deposit of SOL/USDC, amount: 71977425896336
MEMORY USAGE 183.8203125 MB
CHANGE DETECTED! account: SOL deposit of SOL/USDC, amount: 1545392866578769
CHANGE DETECTED! account: GST deposit of GST/USDC, amount: 7624758032892784
CHANGE DETECTED! account: SBR deposit of SBR/USDC, amount: 29086294046341
CHANGE DETECTED! account: USDC deposit of GST/USDC, amount: 8684137753618
CHANGE DETECTED! account: USDC deposit of SOL/USDC, amount: 71977370173423
CHANGE DETECTED! account: USDC deposit of SHDW/USDC, amount: 3617225693555
CHANGE DETECTED! account: SHDW deposit of SHDW/USDC, amount: 4659179981809825
CHANGE DETECTED! account: USDC deposit of SBR/USDC, amount: 288750532790
MEMORY USAGE 183.9296875 MB
CHANGE DETECTED! account: BTC deposit of BTC/USDC, amount: 24352188
CHANGE DETECTED! account: USDC deposit of SHDW/USDC, amount: 3617225693555
CHANGE DETECTED! account: SOL deposit of SOL/USDC, amount: 1545400366578751
CHANGE DETECTED! account: SHDW deposit of SHDW/USDC, amount: 4659179981809825
CHANGE DETECTED! account: mSOL deposit of mSOL/USDC, amount: 13117396302424
CHANGE DETECTED! account: stSOL deposit of stSOL/USDC, amount: 15590128417562
CHANGE DETECTED! account: USDC deposit of mSOL/USDC, amount: 639714292947
CHANGE DETECTED! account: GST deposit of GST/USDC, amount: 7624827392045050
CHANGE DETECTED! account: USDC deposit of GST/USDC, amount: 8684059337979
CHANGE DETECTED! account: USDC deposit of stSOL/USDC, amount: 754847811906
CHANGE DETECTED! account: USDC deposit of SOL/USDC, amount: 71977021907172
CHANGE DETECTED! account: USDC deposit of BTC/USDC, amount: 781934277196
MEMORY USAGE 156.125 MB
CHANGE DETECTED! account: USDC deposit of BTC/USDC, amount: 781934277196
CHANGE DETECTED! account: USDC deposit of GST/USDC, amount: 8683947038278
CHANGE DETECTED! account: FTT deposit of FTT/USDC, amount: 2269091455
CHANGE DETECTED! account: COPE deposit of COPE/SOL, amount: 63702193363
CHANGE DETECTED! account: SHDW deposit of SHDW/USDC, amount: 4659179981809825
CHANGE DETECTED! account: USDC deposit of SOL/USDC, amount: 71977021907172
CHANGE DETECTED! account: USDC deposit of FTT/USDC, amount: 66179260983
CHANGE DETECTED! account: BTC deposit of BTC/USDC, amount: 24352188
CHANGE DETECTED! account: USDC deposit of SHDW/USDC, amount: 3617225693555
CHANGE DETECTED! account: SOL deposit of COPE/SOL, amount: 74405622757
CHANGE DETECTED! account: SOL deposit of SOL/USDC, amount: 1545400366578751
CHANGE DETECTED! account: GST deposit of GST/USDC, amount: 7624926292045582
CHANGE DETECTED! account: USDC deposit of AURY/USDC, amount: 492530699662
CHANGE DETECTED! account: GST deposit of GST/USDC, amount: 7624676210935642
CHANGE DETECTED! account: USDC deposit of SOL/USDC, amount: 71976808040445
CHANGE DETECTED! account: SOL deposit of SOL/USDC, amount: 1545404979562516
CHANGE DETECTED! account: SAMO deposit of SAMO/USDC, amount: 200053411242968401
CHANGE DETECTED! account: USDC deposit of whETH/USDC, amount: 922656003591
CHANGE DETECTED! account: AURY deposit of AURY/USDC, amount: 274403648798311
CHANGE DETECTED! account: USDC deposit of SAMO/USDC, amount: 1165050867797
CHANGE DETECTED! account: USDC deposit of GST/USDC, amount: 8684233529748
CHANGE DETECTED! account: whETH deposit of whETH/USDC, amount: 46273810059
CHANGE DETECTED! account: USDC deposit of whETH/USDC, amount: 922656003591
CHANGE DETECTED! account: GST deposit of GST/USDC, amount: 7624782339090385
CHANGE DETECTED! account: USDC deposit of GST/USDC, amount: 8684113101248
CHANGE DETECTED! account: USDC deposit of SOL/USDC, amount: 71976870219624
CHANGE DETECTED! account: SHDW deposit of SHDW/USDC, amount: 4659179981809825
CHANGE DETECTED! account: whETH deposit of whETH/USDC, amount: 46273810059
CHANGE DETECTED! account: USDC deposit of SHDW/USDC, amount: 3617225693555
CHANGE DETECTED! account: SOL deposit of SOL/USDC, amount: 1545403650324742
stop listening...

*/
