import { Connection, KeyedAccountInfo, DataSizeFilter, MemcmpFilter, PublicKey, Context } from '@solana/web3.js';
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

function orca_pool_deposit_listener(keyed_account_info: KeyedAccountInfo, context: Context) {
  const what_account = publickey_to_pool_info_map.get(keyed_account_info.accountId.toBase58());
  const parsed = deserializeAccount(keyed_account_info.accountInfo.data);

  console.log(`CHANGE DETECTED! slot: ${context.slot} account: ${what_account}, amount: ${parsed.amount.toString()}`);
}

function token_account_listener(keyed_account_info: KeyedAccountInfo, context: Context) {
  if ( publickey_to_pool_info_map.has(keyed_account_info.accountId.toBase58()) ) {
    // call if the account is deposit account of Orca's pool
    orca_pool_deposit_listener(keyed_account_info, context);
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
MEMORY USAGE 174.359375 MB
MEMORY USAGE 183.54296875 MB
MEMORY USAGE 183.54296875 MB
CHANGE DETECTED! slot: 135866641 account: USDC deposit of mSOL/USDC, amount: 639266444623
CHANGE DETECTED! slot: 135866641 account: GST deposit of GST/USDC, amount: 7608532008592361
CHANGE DETECTED! slot: 135866641 account: USDC deposit of BTC/USDC, amount: 781934277196
CHANGE DETECTED! slot: 135866641 account: mSOL deposit of mSOL/USDC, amount: 13126613562418
CHANGE DETECTED! slot: 135866641 account: USDC deposit of whETH/USDC, amount: 921943603566
CHANGE DETECTED! slot: 135866641 account: USDC deposit of SOL/USDC, amount: 71887766300103
CHANGE DETECTED! slot: 135866641 account: SOL deposit of SOL/USDC, amount: 1547328887574215
CHANGE DETECTED! slot: 135866641 account: whETH deposit of whETH/USDC, amount: 46309674163
CHANGE DETECTED! slot: 135866641 account: BTC deposit of BTC/USDC, amount: 24352188
CHANGE DETECTED! slot: 135866641 account: USDC deposit of GST/USDC, amount: 8703261008418
CHANGE DETECTED! slot: 135866642 account: USDC deposit of GST/USDC, amount: 8703102153931
CHANGE DETECTED! slot: 135866642 account: GST deposit of GST/USDC, amount: 7608671302179591
CHANGE DETECTED! slot: 135866642 account: SOL deposit of SOL/USDC, amount: 1547328887574215
CHANGE DETECTED! slot: 135866642 account: USDC deposit of SLND/USDC, amount: 417168950120
CHANGE DETECTED! slot: 135866642 account: SAMO deposit of SAMO/USDC, amount: 200470608720379855
CHANGE DETECTED! slot: 135866642 account: SLND deposit of SLND/USDC, amount: 372810956524
CHANGE DETECTED! slot: 135866642 account: USDC deposit of whETH/USDC, amount: 921943603566
CHANGE DETECTED! slot: 135866642 account: USDC deposit of mSOL/USDC, amount: 639266444623
CHANGE DETECTED! slot: 135866642 account: FTT deposit of FTT/USDC, amount: 2269176823
CHANGE DETECTED! slot: 135866642 account: mSOL deposit of mSOL/USDC, amount: 13126613562418
CHANGE DETECTED! slot: 135866642 account: USDC deposit of FTT/USDC, amount: 66176778711
CHANGE DETECTED! slot: 135866642 account: USDC deposit of SOL/USDC, amount: 71887766300103
CHANGE DETECTED! slot: 135866642 account: whETH deposit of whETH/USDC, amount: 46309674163
CHANGE DETECTED! slot: 135866642 account: USDC deposit of SAMO/USDC, amount: 1162639063679
MEMORY USAGE 186.87109375 MB
CHANGE DETECTED! slot: 135866643 account: USDC deposit of GST/USDC, amount: 8703108756431
CHANGE DETECTED! slot: 135866643 account: USDC deposit of SOL/USDC, amount: 71887817380117
CHANGE DETECTED! slot: 135866643 account: GST deposit of GST/USDC, amount: 7608665884986470
CHANGE DETECTED! slot: 135866643 account: USDC deposit of mSOL/USDC, amount: 639266444623
CHANGE DETECTED! slot: 135866643 account: USDC deposit of whETH/USDC, amount: 921943603566
CHANGE DETECTED! slot: 135866643 account: whETH deposit of whETH/USDC, amount: 46309674163
CHANGE DETECTED! slot: 135866643 account: mSOL deposit of mSOL/USDC, amount: 13126613562418
CHANGE DETECTED! slot: 135866643 account: SOL deposit of SOL/USDC, amount: 1547327791415345
MEMORY USAGE 187.0234375 MB
MEMORY USAGE 187.0234375 MB
MEMORY USAGE 187.0234375 MB
MEMORY USAGE 187.02734375 MB
CHANGE DETECTED! slot: 135866648 account: SAMO deposit of SAMO/USDC, amount: 200470608720379855
CHANGE DETECTED! slot: 135866648 account: USDC deposit of BASIS/USDC, amount: 782831627899
CHANGE DETECTED! slot: 135866648 account: SOL deposit of SOL/USDC, amount: 1547327256902994
CHANGE DETECTED! slot: 135866648 account: USDC deposit of GST/USDC, amount: 8703070052250
CHANGE DETECTED! slot: 135866648 account: GST deposit of GST/USDC, amount: 7608699823964398
CHANGE DETECTED! slot: 135866648 account: whETH deposit of whETH/USDC, amount: 46309674163
CHANGE DETECTED! slot: 135866648 account: USDC deposit of mSOL/USDC, amount: 639266444623
CHANGE DETECTED! slot: 135866648 account: USDC deposit of SAMO/USDC, amount: 1162639063679
CHANGE DETECTED! slot: 135866648 account: USDC deposit of SOL/USDC, amount: 71887842287935
CHANGE DETECTED! slot: 135866648 account: BASIS deposit of BASIS/USDC, amount: 93022267603675
CHANGE DETECTED! slot: 135866648 account: USDC deposit of BTC/USDC, amount: 781934277196
CHANGE DETECTED! slot: 135866648 account: BTC deposit of BTC/USDC, amount: 24352188
CHANGE DETECTED! slot: 135866648 account: USDC deposit of whETH/USDC, amount: 921943603566
CHANGE DETECTED! slot: 135866648 account: mSOL deposit of mSOL/USDC, amount: 13126613562418
MEMORY USAGE 187.5859375 MB
CHANGE DETECTED! slot: 135866649 account: USDC deposit of mSOL/USDC, amount: 639266444623
CHANGE DETECTED! slot: 135866649 account: whETH deposit of whETH/USDC, amount: 46309674163
CHANGE DETECTED! slot: 135866649 account: USDC deposit of whETH/USDC, amount: 921943603566
CHANGE DETECTED! slot: 135866649 account: AURY deposit of AURY/USDC, amount: 274403648798311
CHANGE DETECTED! slot: 135866649 account: SOL deposit of STEP/SOL, amount: 650424975824
CHANGE DETECTED! slot: 135866649 account: USDC deposit of SOL/USDC, amount: 71887393847268
CHANGE DETECTED! slot: 135866649 account: SAMO deposit of SAMO/USDC, amount: 200470608720379855
CHANGE DETECTED! slot: 135866649 account: USDC deposit of SAMO/USDC, amount: 1162639063679
CHANGE DETECTED! slot: 135866649 account: USDC deposit of GST/USDC, amount: 8702690124776
CHANGE DETECTED! slot: 135866649 account: SOL deposit of SOL/USDC, amount: 1547336970370716
CHANGE DETECTED! slot: 135866649 account: USDC deposit of stSOL/USDC, amount: 754365389778
CHANGE DETECTED! slot: 135866649 account: mSOL deposit of mSOL/USDC, amount: 13126613562418
CHANGE DETECTED! slot: 135866649 account: GST deposit of GST/USDC, amount: 7609032998617274
CHANGE DETECTED! slot: 135866649 account: USDC deposit of AURY/USDC, amount: 492530699662
CHANGE DETECTED! slot: 135866649 account: STEP deposit of STEP/SOL, amount: 339840279755212
CHANGE DETECTED! slot: 135866649 account: stSOL deposit of stSOL/USDC, amount: 15600128417550
CHANGE DETECTED! slot: 135866650 account: USDC deposit of FTT/USDC, amount: 66176778711
CHANGE DETECTED! slot: 135866650 account: mSOL deposit of mSOL/USDC, amount: 13126613562418
CHANGE DETECTED! slot: 135866650 account: USDC deposit of GST/USDC, amount: 8702521819720
CHANGE DETECTED! slot: 135866650 account: FTT deposit of FTT/USDC, amount: 2269176823
CHANGE DETECTED! slot: 135866650 account: USDC deposit of mSOL/USDC, amount: 639266444623
CHANGE DETECTED! slot: 135866650 account: USDC deposit of AURY/USDC, amount: 492530699662
CHANGE DETECTED! slot: 135866650 account: USDC deposit of SOL/USDC, amount: 71886730125275
CHANGE DETECTED! slot: 135866650 account: GST deposit of GST/USDC, amount: 7609180598616821
CHANGE DETECTED! slot: 135866650 account: SOL deposit of SOL/USDC, amount: 1547351303762576
CHANGE DETECTED! slot: 135866650 account: USDC deposit of SHDW/USDC, amount: 3617225693555
CHANGE DETECTED! slot: 135866650 account: AURY deposit of AURY/USDC, amount: 274403648798311
CHANGE DETECTED! slot: 135866650 account: SHDW deposit of SHDW/USDC, amount: 4659179981809825
MEMORY USAGE 154.3203125 MB
CHANGE DETECTED! slot: 135866651 account: SOL deposit of SOL/USDC, amount: 1547524463591316
CHANGE DETECTED! slot: 135866651 account: USDC deposit of SHDW/USDC, amount: 3617225693555
CHANGE DETECTED! slot: 135866651 account: SHDW deposit of SHDW/USDC, amount: 4659179981809825
CHANGE DETECTED! slot: 135866651 account: USDC deposit of SOL/USDC, amount: 71878710508869
stop listening...

*/
