import { Buffer } from "buffer";
import { Connection, PublicKey, TransactionInstruction, CompiledInstruction } from "@solana/web3.js";
import { ORCA_WHIRLPOOL_PROGRAM_ID } from "@orca-so/whirlpools-sdk";
import { BorshCoder, Idl } from "@coral-xyz/anchor";
import { DecodedTransferInstruction, TOKEN_PROGRAM_ID, decodeTransferInstruction } from "@solana/spl-token";
import bs58 from "bs58";
import * as prompt from "prompt";

import whirlpool_idl from "@orca-so/whirlpools-sdk/dist/artifacts/whirlpool.json"

const RPC_ENDPOINT_URL = process.env["RPC_ENDPOINT_URL"] || "";

function decode_token_instruction(ix: CompiledInstruction, accounts: PublicKey[]): DecodedTransferInstruction {
  const data = Buffer.from(bs58.decode(ix.data));

  return decodeTransferInstruction(new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    data,
    keys: [
      {pubkey: accounts[ix.accounts[0]], isSigner: false, isWritable: true}, // source
      {pubkey: accounts[ix.accounts[1]], isSigner: false, isWritable: true}, // dest
      {pubkey: accounts[ix.accounts[2]], isSigner: true, isWritable: true},  // authority (owner)
    ]
  }));
}

function print_transfer_instruction(transferIx: DecodedTransferInstruction) {
  console.log(
    "\ttoken instruction:",
    transferIx.keys.source.pubkey.toBase58(),
    ">>",
    transferIx.keys.destination.pubkey.toBase58(),
    transferIx.data.amount.toString(), "(u64)"
  );
}

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");

  // prompt
  const {signature} = await prompt.get(["signature"]);
  console.log("signature:", signature);

  // get transaction
  const tx = await connection.getTransaction(signature, {commitment: "confirmed", maxSupportedTransactionVersion: 0});

  const txmsg = tx.transaction.message;
  const instructions = txmsg.compiledInstructions;
  const staticKeys = txmsg.staticAccountKeys;
  const writableKeys = tx.meta.loadedAddresses.writable;
  const readonlyKeys = tx.meta.loadedAddresses.readonly;
  const accounts: PublicKey[] = [...staticKeys, ...writableKeys, ...readonlyKeys];
  const inner_instructions = tx.meta.innerInstructions || [];

  // flatten all instructions
  const all_instructions: CompiledInstruction[] = [];
  instructions.forEach((ix, i) => {
    all_instructions.push({
        programIdIndex: ix.programIdIndex,
        data: bs58.encode(ix.data),
        accounts: ix.accountKeyIndexes,
    });
    const inner = inner_instructions.find((v) => v.index == i);
    inner?.instructions.forEach((ix) => all_instructions.push(ix));
  });

  // generate coder based on IDL
  const coder = new BorshCoder(whirlpool_idl as Idl);

  // check each instruction
  for (let cursor=0; cursor < all_instructions.length; cursor++) {
    const ix = all_instructions[cursor];
    const program_id = accounts[ix.programIdIndex];

    if ( !program_id.equals(ORCA_WHIRLPOOL_PROGRAM_ID) ) continue;

    // data to u8array (encoded in base58)
    const data_b58 = ix.data;
    // decode whirlpool instruction
    const decoded = coder.instruction.decode(data_b58, "base58");

    console.log("whirlpool instruction:", decoded.name);

    switch ( decoded.name ) {
    case "twoHopSwap":
      // 4 transfer instructions
      print_transfer_instruction( decode_token_instruction(all_instructions[cursor+1], accounts) );
      print_transfer_instruction( decode_token_instruction(all_instructions[cursor+2], accounts) );
      print_transfer_instruction( decode_token_instruction(all_instructions[cursor+3], accounts) );
      print_transfer_instruction( decode_token_instruction(all_instructions[cursor+4], accounts) );
      break;
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
    default:
      // this code is just example, so don't handle other instructions
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
        token instruction: 2gG2nqzdqDnFRio8ttYyCkesTbfqDcbQLrv19n4weuK6 >> pxHaCG5Q85rgXRZ1tP1HWXoTdo9ZkuBLLMdXk17UNm9 3744 (u64)
        token instruction: EWWSKcyMy2cF1RBmcQMPyN8SafyxoUFzmzWsAqReNmQc >> DAeMvh1TvrWkCT4AAvBqTwyVLz5z92wBVtvDWbehRKAo 3266 (u64)
whirlpool instruction: collectReward
        token instruction: Cj8rY5MxWytpJfV6SyctqvVCmC2LAhio1CywBYRMFNRr >> 7B8yNHX62NLvRswD86ttbGcV5TYxUsDNxEg2ZRMZLPRt 44 (u64)
whirlpool instruction: collectReward
        token instruction: 871e3q8rNc46dDLRwn3mpqkqDiiHK1ZcvkHEyYKQNfCv >> BHtKkmqVgA6WeVrZvJDQMsfrBfpzPeuxJW81M364dftH 767802 (u64)

TRANSACTION SAMPLE2:
https://solscan.io/tx/5ftZoC24tmvWYbtm5x8cg3SjgY7YBpJB8WQt4uNin9eF95UJ6BNeT4ahAWAr1SiQhmdyNxbywe7DHgsKHfvdCTSa

OUTPUT SAMPLE2:
$ ts-node src/84c_parse_whirlpool_tx_with_inner_ix.ts 
prompt: signature:  5ftZoC24tmvWYbtm5x8cg3SjgY7YBpJB8WQt4uNin9eF95UJ6BNeT4ahAWAr1SiQhmdyNxbywe7DHgsKHfvdCTSa
signature: 5ftZoC24tmvWYbtm5x8cg3SjgY7YBpJB8WQt4uNin9eF95UJ6BNeT4ahAWAr1SiQhmdyNxbywe7DHgsKHfvdCTSa
whirlpool instruction: updateFeesAndRewards
whirlpool instruction: collectFees
        token instruction: 2gG2nqzdqDnFRio8ttYyCkesTbfqDcbQLrv19n4weuK6 >> 2mjbxoWYamLt4gXRdVvJL5ooFSSvZ2dWEiUBWk2E6BmZ 3 (u64)
        token instruction: EWWSKcyMy2cF1RBmcQMPyN8SafyxoUFzmzWsAqReNmQc >> DAeMvh1TvrWkCT4AAvBqTwyVLz5z92wBVtvDWbehRKAo 0 (u64)
whirlpool instruction: collectReward
        token instruction: Cj8rY5MxWytpJfV6SyctqvVCmC2LAhio1CywBYRMFNRr >> 7B8yNHX62NLvRswD86ttbGcV5TYxUsDNxEg2ZRMZLPRt 0 (u64)
whirlpool instruction: collectReward
        token instruction: 871e3q8rNc46dDLRwn3mpqkqDiiHK1ZcvkHEyYKQNfCv >> BHtKkmqVgA6WeVrZvJDQMsfrBfpzPeuxJW81M364dftH 372 (u64)
whirlpool instruction: decreaseLiquidity
        token instruction: 2gG2nqzdqDnFRio8ttYyCkesTbfqDcbQLrv19n4weuK6 >> 2mjbxoWYamLt4gXRdVvJL5ooFSSvZ2dWEiUBWk2E6BmZ 13195148 (u64)
        token instruction: EWWSKcyMy2cF1RBmcQMPyN8SafyxoUFzmzWsAqReNmQc >> DAeMvh1TvrWkCT4AAvBqTwyVLz5z92wBVtvDWbehRKAo 5888809 (u64)

TRANSACTION SAMPLE3:
https://solscan.io/tx/2v6HxAYfDZjB5hjoU2SvKF8hmUFLsxLrzjRE7B9P1gGjDpn5NnqFCaduCbF7Nxzg2LfEaD1w4oyT5LoNyfd5jRXL

OUTPUT SAMPLE3:
$ ts-node src/84c_parse_whirlpool_tx_with_inner_ix.ts 
prompt: signature:  2v6HxAYfDZjB5hjoU2SvKF8hmUFLsxLrzjRE7B9P1gGjDpn5NnqFCaduCbF7Nxzg2LfEaD1w4oyT5LoNyfd5jRXL
signature: 2v6HxAYfDZjB5hjoU2SvKF8hmUFLsxLrzjRE7B9P1gGjDpn5NnqFCaduCbF7Nxzg2LfEaD1w4oyT5LoNyfd5jRXL
whirlpool instruction: twoHopSwap
        token instruction: 7Q6tDKDY6fFaS8i9TUBofQSmTcNsQPF72dE7HBoK6ZRe >> HDdh3tmW14yvRVQDJ5UfpatosedTdTamz8Swoin4yS7 10000000 (u64)
        token instruction: 7zvUKaEeGAcKAKqABmZHsDH3kTHfjwrhWBT4BvJtSCyV >> 9NxwyjcHsSUL8Y45vdogjfp61KyoLLnoB2QJEcRqSNrp 109562650 (u64)
        token instruction: 9NxwyjcHsSUL8Y45vdogjfp61KyoLLnoB2QJEcRqSNrp >> 7UdFF2he8LzFXgRkNRi1whPsLRJhC1xFzFpkSy7XscoX 109562650 (u64)
        token instruction: GKHTvUWKvLLcUUYcbbP4V89RFoFpRViJ4ajXunHK328q >> 8ewGWrSjhb9gG37TF5tzyw1vM1wMP1AenYuGEhQZSrFF 37664586814 (u64)

*/
