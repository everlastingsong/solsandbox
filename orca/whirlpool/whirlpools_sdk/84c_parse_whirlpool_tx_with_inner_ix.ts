import { Buffer } from "buffer";
import { Connection, PublicKey } from "@solana/web3.js";
import { ORCA_WHIRLPOOL_PROGRAM_ID } from "@orca-so/whirlpools-sdk";
import { BorshCoder, Idl } from "@project-serum/anchor";
import { decodeTokenInstruction } from "@project-serum/token" // npm i @project-serum/token
import bs58 from "bs58";
import * as prompt from "prompt";

import whirlpool_idl from "@orca-so/whirlpools-sdk/dist/artifacts/whirlpool.json"

const RPC_ENDPOINT_URL = "https://api.mainnet-beta.solana.com";

// decode token instruction based on @project-serum/token
function decode_token_instruction(ix, accounts: PublicKey[]) {
  const data = Buffer.from(bs58.decode(ix["data"]));
  const keys = ix["accounts"].map((i) => { return {pubkey: accounts[i]} });
  return decodeTokenInstruction({data, keys} as any);
}

function print_transfer_instruction(ix) {
  console.log(
    "\ttoken instruction:",
    ix.type,
    ix.params["source"]?.toBase58(),
    ">>",
    ix.params["destination"]?.toBase58(),
    ix.params["amount"]?.toString()
  );
}

async function main() {
  // prompt
  const {signature} = await prompt.get(["signature"]);
  console.log("signature:", signature);

  // get transaction
  const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");

  const tx = await connection.getTransaction(signature);
  const txmsg = tx.transaction.message;
  const instructions = txmsg.instructions;
  const accounts = txmsg.accountKeys;
  const inner_instructions = tx.meta.innerInstructions || [];

  // flatten all instructions
  const all_instructions = [];
  instructions.forEach((ix, i) => {
    all_instructions.push(ix);
    const inner = inner_instructions.find((v) => v.index == i);
    inner?.instructions.forEach((ix) => all_instructions.push(ix));
  });

  // coder
  const coder = new BorshCoder(whirlpool_idl as Idl);

  // check each instruction
  for (let cursor=0; cursor < all_instructions.length; cursor++ ) {
    const ix = all_instructions[cursor];
    const program_id = accounts[ix.programIdIndex];

    if ( !program_id.equals(ORCA_WHIRLPOOL_PROGRAM_ID) ) continue;

    // data to u8array (encoded in base58)
    const data_b58 = ix["data"];
    // decode whirlpool instruction
    const decoded = coder.instruction.decode(data_b58, "base58");

    console.log("whirlpool instruction:", decoded.name);

    switch ( decoded.name ) {
    case "swap":
    case "increaseLiquidity":
    case "decreaseLiquidity":
    case "collectFees":
    case "collectProtocolFees":
      // 2 transfer instructions
      print_transfer_instruction( decode_token_instruction(all_instructions[cursor+1], accounts) );
      print_transfer_instruction( decode_token_instruction(all_instructions[cursor+2], accounts) );
      break;
    case "collectReward":
      // 1 transfer instruction
      print_transfer_instruction( decode_token_instruction(all_instructions[cursor+1], accounts) );
      break;
    }
  }
}

main();


/*
TRANSACTION SAMPLE1:
https://solscan.io/tx/57QKWfyNgv4dHmL97r18fkb7GZQsGQCuRRVkWTofGB1Z8sz5NB3gJ52Tzy4d4Wzwb4x2G3Krirsu33nTeSSB46Sp

OUTPUT SAMPLE1:
$ ts-node src/84c_parse_whirlpool_tx_with_inner_ix.ts
prompt: signature:  57QKWfyNgv4dHmL97r18fkb7GZQsGQCuRRVkWTofGB1Z8sz5NB3gJ52Tzy4d4Wzwb4x2G3Krirsu33nTeSSB46Sp
signature: 57QKWfyNgv4dHmL97r18fkb7GZQsGQCuRRVkWTofGB1Z8sz5NB3gJ52Tzy4d4Wzwb4x2G3Krirsu33nTeSSB46Sp
whirlpool instruction: updateFeesAndRewards
whirlpool instruction: collectFees
        token instruction: transfer 2gG2nqzdqDnFRio8ttYyCkesTbfqDcbQLrv19n4weuK6 >> pxHaCG5Q85rgXRZ1tP1HWXoTdo9ZkuBLLMdXk17UNm9 3744
        token instruction: transfer EWWSKcyMy2cF1RBmcQMPyN8SafyxoUFzmzWsAqReNmQc >> DAeMvh1TvrWkCT4AAvBqTwyVLz5z92wBVtvDWbehRKAo 3266
whirlpool instruction: collectReward
        token instruction: transfer Cj8rY5MxWytpJfV6SyctqvVCmC2LAhio1CywBYRMFNRr >> 7B8yNHX62NLvRswD86ttbGcV5TYxUsDNxEg2ZRMZLPRt 44
whirlpool instruction: collectReward
        token instruction: transfer 871e3q8rNc46dDLRwn3mpqkqDiiHK1ZcvkHEyYKQNfCv >> BHtKkmqVgA6WeVrZvJDQMsfrBfpzPeuxJW81M364dftH 767802


TRANSACTION SAMPLE2:
https://solscan.io/tx/5ftZoC24tmvWYbtm5x8cg3SjgY7YBpJB8WQt4uNin9eF95UJ6BNeT4ahAWAr1SiQhmdyNxbywe7DHgsKHfvdCTSa

OUTPUT SAMPLE2:
$ ts-node src/84c_parse_whirlpool_tx_with_inner_ix.ts 
prompt: signature:  5ftZoC24tmvWYbtm5x8cg3SjgY7YBpJB8WQt4uNin9eF95UJ6BNeT4ahAWAr1SiQhmdyNxbywe7DHgsKHfvdCTSa
signature: 5ftZoC24tmvWYbtm5x8cg3SjgY7YBpJB8WQt4uNin9eF95UJ6BNeT4ahAWAr1SiQhmdyNxbywe7DHgsKHfvdCTSa
whirlpool instruction: updateFeesAndRewards
whirlpool instruction: collectFees
        token instruction: transfer 2gG2nqzdqDnFRio8ttYyCkesTbfqDcbQLrv19n4weuK6 >> 2mjbxoWYamLt4gXRdVvJL5ooFSSvZ2dWEiUBWk2E6BmZ 3
        token instruction: transfer EWWSKcyMy2cF1RBmcQMPyN8SafyxoUFzmzWsAqReNmQc >> DAeMvh1TvrWkCT4AAvBqTwyVLz5z92wBVtvDWbehRKAo 0
whirlpool instruction: collectReward
        token instruction: transfer Cj8rY5MxWytpJfV6SyctqvVCmC2LAhio1CywBYRMFNRr >> 7B8yNHX62NLvRswD86ttbGcV5TYxUsDNxEg2ZRMZLPRt 0
whirlpool instruction: collectReward
        token instruction: transfer 871e3q8rNc46dDLRwn3mpqkqDiiHK1ZcvkHEyYKQNfCv >> BHtKkmqVgA6WeVrZvJDQMsfrBfpzPeuxJW81M364dftH 372
whirlpool instruction: decreaseLiquidity
        token instruction: transfer 2gG2nqzdqDnFRio8ttYyCkesTbfqDcbQLrv19n4weuK6 >> 2mjbxoWYamLt4gXRdVvJL5ooFSSvZ2dWEiUBWk2E6BmZ 13195148
        token instruction: transfer EWWSKcyMy2cF1RBmcQMPyN8SafyxoUFzmzWsAqReNmQc >> DAeMvh1TvrWkCT4AAvBqTwyVLz5z92wBVtvDWbehRKAo 5888809
whirlpool instruction: closePosition


TRANSACTION SAMPLE3:
https://solscan.io/tx/Rh8cKy8P8v7KMqkShSonUYZb7NKeDq6MkjyeZDjE9no1BdCN2ELuVSwN5TPmdnsFGAHVzXsewKUjyG5YrUVED56

OUTPUT SAMPLE3:
$ ts-node src/84c_parse_whirlpool_tx_with_inner_ix.ts 
prompt: signature:  Rh8cKy8P8v7KMqkShSonUYZb7NKeDq6MkjyeZDjE9no1BdCN2ELuVSwN5TPmdnsFGAHVzXsewKUjyG5YrUVED56
signature: Rh8cKy8P8v7KMqkShSonUYZb7NKeDq6MkjyeZDjE9no1BdCN2ELuVSwN5TPmdnsFGAHVzXsewKUjyG5YrUVED56
whirlpool instruction: swap
        token instruction: transfer GrjwegH3qhmSfKxtgqxLmNaWxqTah6scBEqMeNgZfcA3 >> 9RfZwn2Prux6QesG1Noo4HzMEBv3rPndJ2bN2Wwd6a7p 5000000000
        token instruction: transfer BVNo8ftg2LkkssnWT4ZWdtoFaevnfD6ExYeramwM27pe >> 5RxrCig1GSvZGCcYRA42tYfAqt9ey3gc7813m1zcvDR4 158308811
whirlpool instruction: swap
        token instruction: transfer Ci3FCwMdtaD3UogVdw9d8CLrgwNaFR4yfV5Ec5kAztMv >> 71SPVh1eUFC6bZgS6dMxRVsN2h1Y77p9kgb1E3DuWSv4 4699197832
        token instruction: transfer 4iQge2PC2YCT2Dop3cbs33QdEyZtkzKfyYGh2J8idcye >> GrjwegH3qhmSfKxtgqxLmNaWxqTah6scBEqMeNgZfcA3 5000481180

*/