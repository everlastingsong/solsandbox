import { Connection } from "@solana/web3.js";
import base58 from "bs58";

const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net";

const commitment = 'confirmed';
const connection = new Connection(RPC_ENDPOINT_URL, commitment);

async function main() {
  const ORCA_PROGRAMS = [
    "DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1", // V1
    "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP"  // V2
  ];

  const TARGET_SIGNATURE = "4KY3PN6HFbwmCqjRr4ZLExRxY8whbnNymgPPyUn8PT1aY8BWFUKdRaeaWaY1yq6rinLjbArd8xRGkmdE6xqB8hGF";

  const tx = await connection.getParsedTransaction(TARGET_SIGNATURE);
  const instructions = tx.transaction.message.instructions;
  const has_inner_instructions = tx.meta.innerInstructions;

  // console.log("instructions", instructions);
  //
  // instructions [
  //  {
  //    parsed: { info: [Object], type: 'createAccount' },
  //    program: 'system',
  //    programId: PublicKey { _bn: <BN: 0> }
  //  },
  //  {
  //    parsed: { info: [Object], type: 'initializeAccount' },
  //    program: 'spl-token',
  //    programId: PublicKey {
  //      _bn: <BN: 6ddf6e1d765a193d9cbe146ceeb79ac1cb485ed5f5b37913a8cf5857eff00a9>
  //    }
  //  },

  // console.log("has_inner_instructions", has_inner_instructions);
  //
  // has_inner_instructions [
  //  { index: 3, instructions: [ [Object], [Object] ] },
  //  { index: 5, instructions: [ [Object], [Object], [Object] ] }
  // ]

  // swap instruction has two or three inner instructions (transfer + transfer OR transfer + mint + transfer)
  has_inner_instructions.map((has_inner_instruction) => {
    const instruction = instructions[has_inner_instruction.index];
    const inner_instructions = has_inner_instruction.instructions;

    const program_b58 = instruction.programId.toBase58();
    if ( !ORCA_PROGRAMS.includes(program_b58) ) return;

    const data_bytes = base58.decode(instruction["data"]);
    if ( data_bytes[0] != 1 /* swap instruction */) return;

    const pool = instruction["accounts"][0];

    // console.log(inner_instructions[0]);
    //
    // {
    //   parsed: {
    //     info: {
    //       amount: '3119666',
    //       authority: '6JqpSRs2R3SbxSJjtao6KyePn74D6MejiREDJGKAmbEv',
    //       destination: 'BbsiNbFfJsRDwqF4JaiJ6sKecNuY4eWmEaDHcY6h6HuD',
    //       source: '9FCVhSS9rb6eqdZ7QB8wwnCperXHS317EacR37xuWktk'
    //     },
    //     type: 'transfer'
    //   },
    //   program: 'spl-token',
    //   programId: PublicKey {
    //     _bn: <BN: 6ddf6e1d765a193d9cbe146ceeb79ac1cb485ed5f5b37913a8cf5857eff00a9>
    //   }
    // }
    const in_transfer = inner_instructions[0]["parsed"]["info"];
    const out_transfer = inner_instructions.slice(-1)[0]["parsed"]["info"];

    console.log(`swap! pool: ${pool.toBase58()}`);
    console.log(`  input ${in_transfer.amount}: ${in_transfer.source} >> ${in_transfer.destination}`);
    console.log(`  output ${out_transfer.amount}: ${out_transfer.destination} << ${out_transfer.source}`);
  });
}

main();

/*

TRANSACTION SAMPLE:

https://solscan.io/tx/4KY3PN6HFbwmCqjRr4ZLExRxY8whbnNymgPPyUn8PT1aY8BWFUKdRaeaWaY1yq6rinLjbArd8xRGkmdE6xqB8hGF

OUTPUT SAMPLE:

$ ts-node src/get_route_swap_transaction.ts 
swap! pool: 6fTRDD7sYxCN7oyoSQaN1AWC3P2m8A6gVZzGrpej9DvL
  input 100000: FbQdXCQgGQYj3xcGeryVVFjKCTsAuu53vmCRtmjQEqM5 >> 7VcwKUtdKnvcgNhZt5BQHsbPrXLxhdVomsgrr7k2N5P5
  output 3119864: 9FCVhSS9rb6eqdZ7QB8wwnCperXHS317EacR37xuWktk << FdiTt7XQ94fGkgorywN1GuXqQzmURHCDgYtUutWRcy4q

  swap! pool: 68Bg6yQxWm3mrUYk3XzMiF5ycE41HwPhyEdaB1cp6wuo
  input 3119666: 9FCVhSS9rb6eqdZ7QB8wwnCperXHS317EacR37xuWktk >> BbsiNbFfJsRDwqF4JaiJ6sKecNuY4eWmEaDHcY6h6HuD
  output 4225: DJHX6f8PgeW5kcAmmvSTo9RHF2twBSMyEz5uiXiAwzHB << 3eVE92aEAsLYcBACXNu1yxoHVfTM8e8vmQC2zSApGRJX

*/