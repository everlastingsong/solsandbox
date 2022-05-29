import { Connection, PublicKey } from "@solana/web3.js";
import { OrcaWhirlpoolClient, OrcaNetwork } from "@orca-so/whirlpool-sdk";
import { parsePosition } from "@orca-so/whirlpool-client-sdk";

async function main() {
  const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net";
  const commitment = 'confirmed';
  
  // create OrcaWhirlpoolClient
  const connection = new Connection(RPC_ENDPOINT_URL, commitment);
  const orca = new OrcaWhirlpoolClient({ network: OrcaNetwork.MAINNET, connection: connection });

  const my_pubkey = new PublicKey("r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6");
  const positions = await orca.getUserPositions(my_pubkey, true);

  const position_pubkeys_b58 = Object.keys(positions);
  const position_pubkeys = position_pubkeys_b58.map((b58) => new PublicKey(b58));
  console.log(position_pubkeys_b58);

  let previous_slot = 0;
  let previous_positions = null;
  for (let i=0; i<10; i++) {
    //const current_positions = await orca.getUserPositions(my_pubkey, true);

    // get position accounts with context (max 100 account per call)
    const position_accounts = await connection.getMultipleAccountsInfoAndContext(position_pubkeys);

    // get slot
    const slot = position_accounts.context.slot;
    // get account_info and parse them into PositionData
    const current_positions = position_accounts.value.map((account_info) => parsePosition(account_info.data));

    // modify if slot is greater than previous_slot
    if ( slot > previous_slot ) {
      console.log("updated!", previous_slot , "->", slot);
      console.log("  liquidity of first position", current_positions[0].liquidity.toString());
      previous_slot = slot;
      previous_positions = current_positions;
    } else if ( slot < previous_positions) {
      console.log("degrade!, IGNORED", previous_slot , "->", slot)
      console.log("  liquidity of first position", previous_positions[0].liquidity.toString());
    } else {
      console.log("NOT updated", previous_slot , "->", slot);
      console.log("  liquidity of first position", previous_positions[0].liquidity.toString());
    }

    // sleep...
    const sleep_sec = 1;
    await new Promise(resolve => setTimeout(resolve, sleep_sec*1000));
  }
}

main();

/*

SAMPLE OUTPUT:

$ ts-node src/get_whirlpool_position_with_slot.ts 
[
  '9UP6D8rR9BVbVDqUkG8wkz9eZVBh69huKraaHehJyH3Z',
  '5j3szbi2vnydYoyALNgttPD9YhCNwshUGkhzmzaP4WF7',
  '4bwWbT1xgPC1vC245XFcV4HKobc9Kxaau7yH6TGG7S5D',
  '4C5A5TsSZrmoPiptbfqqDjK4LsBcFbuJG76MDja6U3VV',
  'Frpe9FB5NeyzUyt7cinB93RBwJ3zwkwGEF7XfgkymhD',
  '95fV2Vwf8BeekxKToKFdc3dJ6jCdYnrF36ibJU4yztst'
]
updated! 0 -> 135571004
  liquidity of first position 7376472
updated! 135571004 -> 135571006
  liquidity of first position 7376472
NOT updated 135571006 -> 135571006
  liquidity of first position 7376472
updated! 135571006 -> 135571008
  liquidity of first position 7376472
updated! 135571008 -> 135571011
  liquidity of first position 7376472
NOT updated 135571011 -> 135571011
  liquidity of first position 7376472
NOT updated 135571011 -> 135571011
  liquidity of first position 7376472
NOT updated 135571011 -> 135571011
  liquidity of first position 7376472
NOT updated 135571011 -> 135571011
  liquidity of first position 7376472
updated! 135571011 -> 135571013
  liquidity of first position 7376472

*/
