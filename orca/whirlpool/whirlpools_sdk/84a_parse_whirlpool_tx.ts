import { Buffer } from "buffer";
import { sha256 } from "js-sha256";
import { snakeCase } from "snake-case";

import { Connection } from "@solana/web3.js";
import bs58 from "bs58";
import * as prompt from "prompt";

import { ORCA_WHIRLPOOL_PROGRAM_ID } from "@orca-so/whirlpools-sdk";

const RPC_ENDPOINT_URL = "https://api.mainnet-beta.solana.com";

// PORTING FROM: https://github.com/everlastingsong/solsandbox/tree/main/anchor/get_anchor_instruction_code
const SIGHASH_GLOBAL_NAMESPACE = "global";
// https://github.com/coral-xyz/anchor/blob/master/ts/src/coder/borsh/instruction.ts#L388
function sighash(nameSpace: string, ixName: string): Buffer {
  let name = snakeCase(ixName);
  let preimage = `${nameSpace}:${name}`;
  return Buffer.from(sha256.digest(preimage)).slice(0, 8);
}

// https://github.com/orca-so/whirlpools/blob/main/sdk/src/artifacts/whirlpool.json#L4
const WHIRLPOOL_TARGET_INSTRUCTIONS = [
  "increaseLiquidity",
  "decreaseLiquidity",
  "collectFees",
  "collectReward",
];

async function main() {
  // prompt
  const {signature} = await prompt.get(["signature"]);
  console.log("signature:", signature);

  // get transaction
  const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");
  const tx = await connection.getParsedTransaction(signature);
  const txmsg = tx.transaction.message;

  // check each instruction (should check inner instruction ? (^^; ))
  for ( const ix of txmsg.instructions ) {
    // only whirlpool instructions
    if ( ! ix.programId.equals(ORCA_WHIRLPOOL_PROGRAM_ID) ) continue;

    // data to u8array (encoded in base58)
    const data_raw = ix["data"];
    const data_u8array = bs58.decode(data_raw);

    // slice first 8 bytes and convert into hex string
    const ix_code = Buffer.from(data_u8array.slice(0, 8)).toString("hex");

    // find name based on ix_code (cachable (^^; ))
    let ix_name = "NAME NOT FOUND";
    for ( const name of WHIRLPOOL_TARGET_INSTRUCTIONS ) {
      const ix_code_from_name = sighash(SIGHASH_GLOBAL_NAMESPACE, name).toString("hex");
      if ( ix_code === ix_code_from_name ) {
        ix_name = name;
      }
    }

    console.log("whirlpool instruction found:", ix_name, ix_code);
  }
}

main();

/*
TRANSACTION SAMPLE:
https://github.com/everlastingsong/solsandbox/tree/main/orca/whirlpool#transaction-sample

OUTPUT SAMPLE:

# INCREASE(DEPOSIT)
$ ts-node src/84a_parse_whirlpool_tx.ts 
prompt: signature:  Qjsm5Xc9xZzzL6XN67z83i19qPhyZJHpz65ousM4E7rfHDsoxdrc5jbzDfdQH4BzUxyTUfA7stjbW2LAkJhuPLf
signature: Qjsm5Xc9xZzzL6XN67z83i19qPhyZJHpz65ousM4E7rfHDsoxdrc5jbzDfdQH4BzUxyTUfA7stjbW2LAkJhuPLf
whirlpool instruction found: increaseLiquidity 2e9cf3760dcdfbb2

# DECREASE(WITHDRAW)
$ ts-node src/84a_parse_whirlpool_tx.ts 
prompt: signature:  2Aku1adJ9xpjBwW8J8tQ2tn63DNg2HfkuGQEtzhdjoW6xaATU1rgtjqnd1AmcdfBEweTFZA8Z1TdjrU23rnMeD9Y
signature: 2Aku1adJ9xpjBwW8J8tQ2tn63DNg2HfkuGQEtzhdjoW6xaATU1rgtjqnd1AmcdfBEweTFZA8Z1TdjrU23rnMeD9Y
whirlpool instruction found: decreaseLiquidity a026d06f685b2c01

# HARVEST
$ ts-node src/84a_parse_whirlpool_tx.ts 
prompt: signature:  57QKWfyNgv4dHmL97r18fkb7GZQsGQCuRRVkWTofGB1Z8sz5NB3gJ52Tzy4d4Wzwb4x2G3Krirsu33nTeSSB46Sp
signature: 57QKWfyNgv4dHmL97r18fkb7GZQsGQCuRRVkWTofGB1Z8sz5NB3gJ52Tzy4d4Wzwb4x2G3Krirsu33nTeSSB46Sp
whirlpool instruction found: NAME NOT FOUND 9ae6fa0decd14bdf
whirlpool instruction found: collectFees a498cf631eba13b6
whirlpool instruction found: collectReward 4605845756ebb122
whirlpool instruction found: collectReward 4605845756ebb122

# CLOSE POSITION
$ ts-node src/84a_parse_whirlpool_tx.ts 
prompt: signature:  5ftZoC24tmvWYbtm5x8cg3SjgY7YBpJB8WQt4uNin9eF95UJ6BNeT4ahAWAr1SiQhmdyNxbywe7DHgsKHfvdCTSa
signature: 5ftZoC24tmvWYbtm5x8cg3SjgY7YBpJB8WQt4uNin9eF95UJ6BNeT4ahAWAr1SiQhmdyNxbywe7DHgsKHfvdCTSa
whirlpool instruction found: NAME NOT FOUND 9ae6fa0decd14bdf
whirlpool instruction found: collectFees a498cf631eba13b6
whirlpool instruction found: collectReward 4605845756ebb122
whirlpool instruction found: collectReward 4605845756ebb122
whirlpool instruction found: decreaseLiquidity a026d06f685b2c01
whirlpool instruction found: NAME NOT FOUND 7b86510031446262
 
*/