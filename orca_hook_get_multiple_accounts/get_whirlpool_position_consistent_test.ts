import { Connection, PublicKey } from "@solana/web3.js";
import { OrcaWhirlpoolClient, OrcaNetwork } from "@orca-so/whirlpool-sdk";

// hook getMultipleAccounts RPC call and print the slot of its response.
class HookConnection extends Connection {
  hook_get_multiple_accounts() {
    const org_rpcRequest = (this as any)._rpcRequest;

    (this as any)._rpcRequest = (method, args) => {
      if ( method !== "getMultipleAccounts" ) {
        return org_rpcRequest(method, args);
      }
      else {
        return new Promise(async (resolve, reject) => {
          const response = await org_rpcRequest(method, args);
          console.log("getMultipleAccounts", "slot:", response.result.context.slot);
          resolve(response);
        });
      }
    };
  }
}

async function main() {
  // create HookConnection
  //const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net";
  const RPC_ENDPOINT_URL = "https://api.mainnet-beta.solana.com";
  //const RPC_ENDPOINT_URL = "https://solana-api.projectserum.com";

  const commitment = 'confirmed';

  const connection = new HookConnection(RPC_ENDPOINT_URL, commitment);
  connection.hook_get_multiple_accounts();
  
  // create OrcaWhirlpoolClient with HookConnection
  const orca = new OrcaWhirlpoolClient({ network: OrcaNetwork.MAINNET, connection: connection });

  const my_pubkey = new PublicKey("r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6");
  for (let i=0; i<10; i++) {
    console.log("call orca.getUserPositions...");
    const positions = await orca.getUserPositions(my_pubkey, true);

    // sleep...
    const sleep_sec = 1;
    await new Promise(resolve => setTimeout(resolve, sleep_sec*1000));
  }
}

main();

/*

OUTPUT: GenesysGo

$ ts-node src/get_whirlpool_position_consistent_test.ts 
call orca.getUserPositions...
getMultipleAccounts slot: 135409267
getMultipleAccounts slot: 135409267
getMultipleAccounts slot: 135409267
getMultipleAccounts slot: 135409267
call orca.getUserPositions...
getMultipleAccounts slot: 135409279
getMultipleAccounts slot: 135409279
getMultipleAccounts slot: 135409278
call orca.getUserPositions...
getMultipleAccounts slot: 135409279
getMultipleAccounts slot: 135409279
getMultipleAccounts slot: 135409280
call orca.getUserPositions...
getMultipleAccounts slot: 135409280
getMultipleAccounts slot: 135409280
getMultipleAccounts slot: 135409280
call orca.getUserPositions...
getMultipleAccounts slot: 135409285
getMultipleAccounts slot: 135409284
getMultipleAccounts slot: 135409284
call orca.getUserPositions...
getMultipleAccounts slot: 135409287
getMultipleAccounts slot: 135409287
getMultipleAccounts slot: 135409284
call orca.getUserPositions...
getMultipleAccounts slot: 135409287
getMultipleAccounts slot: 135409287
getMultipleAccounts slot: 135409287
call orca.getUserPositions...
getMultipleAccounts slot: 135409290
getMultipleAccounts slot: 135409287
getMultipleAccounts slot: 135409291
call orca.getUserPositions...
getMultipleAccounts slot: 135409292
getMultipleAccounts slot: 135409291
getMultipleAccounts slot: 135409293
call orca.getUserPositions...
getMultipleAccounts slot: 135409294
getMultipleAccounts slot: 135409294
getMultipleAccounts slot: 135409295

Output: Solana.com

$ ts-node src/get_whirlpool_position_consistent_test.ts 
call orca.getUserPositions...
getMultipleAccounts slot: 135409403
getMultipleAccounts slot: 135409403
getMultipleAccounts slot: 135409403
getMultipleAccounts slot: 135409403
call orca.getUserPositions...
getMultipleAccounts slot: 135409404
getMultipleAccounts slot: 135409404
getMultipleAccounts slot: 135409404
call orca.getUserPositions...
getMultipleAccounts slot: 135409406
getMultipleAccounts slot: 135409406
getMultipleAccounts slot: 135409406
call orca.getUserPositions...
getMultipleAccounts slot: 135409406
getMultipleAccounts slot: 135409406
getMultipleAccounts slot: 135409406
call orca.getUserPositions...
getMultipleAccounts slot: 135409406
getMultipleAccounts slot: 135409406
getMultipleAccounts slot: 135409406
call orca.getUserPositions...
getMultipleAccounts slot: 135409411
getMultipleAccounts slot: 135409411
getMultipleAccounts slot: 135409411
call orca.getUserPositions...
getMultipleAccounts slot: 135409411
getMultipleAccounts slot: 135409412
getMultipleAccounts slot: 135409412
call orca.getUserPositions...
getMultipleAccounts slot: 135409413
getMultipleAccounts slot: 135409413
getMultipleAccounts slot: 135409413
call orca.getUserPositions...
getMultipleAccounts slot: 135409414
Server responded with 429 Too Many Requests.  Retrying after 500ms delay...
getMultipleAccounts slot: 135409414
Server responded with 429 Too Many Requests.  Retrying after 500ms delay...
getMultipleAccounts slot: 135409415
call orca.getUserPositions...
getMultipleAccounts slot: 135409415
getMultipleAccounts slot: 135409415
getMultipleAccounts slot: 135409415

Output: Project-Serum

$ ts-node src/get_whirlpool_position_consistent_test.ts 
call orca.getUserPositions...
getMultipleAccounts slot: 135409587
getMultipleAccounts slot: 135409589
getMultipleAccounts slot: 135409591
getMultipleAccounts slot: 135409591
call orca.getUserPositions...
getMultipleAccounts slot: 135409591
getMultipleAccounts slot: 135409596
getMultipleAccounts slot: 135409596
call orca.getUserPositions...
getMultipleAccounts slot: 135409599
getMultipleAccounts slot: 135409598
getMultipleAccounts slot: 135409599
call orca.getUserPositions...
getMultipleAccounts slot: 135409601
getMultipleAccounts slot: 135409601
getMultipleAccounts slot: 135409601
call orca.getUserPositions...
getMultipleAccounts slot: 135409603
getMultipleAccounts slot: 135409603
getMultipleAccounts slot: 135409605
call orca.getUserPositions...
getMultipleAccounts slot: 135409607
getMultipleAccounts slot: 135409606
getMultipleAccounts slot: 135409607
call orca.getUserPositions...
getMultipleAccounts slot: 135409514
getMultipleAccounts slot: 135409611
getMultipleAccounts slot: 135409611
call orca.getUserPositions...
getMultipleAccounts slot: 135409611
getMultipleAccounts slot: 135409611
getMultipleAccounts slot: 135409613
call orca.getUserPositions...
getMultipleAccounts slot: 135409614
getMultipleAccounts slot: 135409616
getMultipleAccounts slot: 135409616
call orca.getUserPositions...
getMultipleAccounts slot: 135409617
getMultipleAccounts slot: 135409617
getMultipleAccounts slot: 135409619

*/
