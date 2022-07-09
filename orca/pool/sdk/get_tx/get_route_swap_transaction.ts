import { Connection } from "@solana/web3.js";
import base58 from "bs58";

const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net";

const commitment = 'confirmed';
const connection = new Connection(RPC_ENDPOINT_URL, commitment);

async function main() {
  const ORCA_PROGRAMS = [
    "DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1", // OrcaSwapV1
    "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP"  // OrcaSwapV2
  ];

  const TARGET_SIGNATURE = "5ptkFkmYTmLnE6cCqoJQutQNJszqGNXS1TcwTP9idAmEP5SgNcXC7Uuk8jZzmtrkdcArJczvQWMAxRrqAjWmuCRJ";

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

    // https://github.com/solana-labs/solana-program-library/blob/master/token-swap/program/src/instruction.rs#L205
    const data_bytes = base58.decode(instruction["data"]);
    if ( data_bytes[0] != 1 /* swap instruction */) return;

    const pool = instruction["accounts"][0];

    // console.log(inner_instructions[0]);
    //
    // {
    //   parsed: {
    //     info: {
    //       amount: '100000',
    //       authority: 'H77i7dqcACrsyZLi3JL6GYuWSRLZ7mMyN1Qp8D3vaen2',
    //       destination: '75HgnSvXbWKZBpZHveX68ZzAhDqMzNDS29X6BGLtxMo1',
    //       source: 'FbQdXCQgGQYj3xcGeryVVFjKCTsAuu53vmCRtmjQEqM5'
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

https://solscan.io/tx/5ptkFkmYTmLnE6cCqoJQutQNJszqGNXS1TcwTP9idAmEP5SgNcXC7Uuk8jZzmtrkdcArJczvQWMAxRrqAjWmuCRJ

OUTPUT SAMPLE:

$ ts-node src/get_route_swap_transaction.ts 
swap! pool: EGZ7tiLeH62TPV1gL8WwbXGzEPa9zmcpVnnkPKKnrE2U
  input 100000: FbQdXCQgGQYj3xcGeryVVFjKCTsAuu53vmCRtmjQEqM5 >> 75HgnSvXbWKZBpZHveX68ZzAhDqMzNDS29X6BGLtxMo1
  output 3101925: 922EMbZfqss92r2Czd6qqsxLBQh4x5FhDNw9FS2WxhAh << ANP74VNsHwSrq9uUSjiSNyNWvf6ZPrKTmE4gHoNd13Lg

swap! pool: 68Bg6yQxWm3mrUYk3XzMiF5ycE41HwPhyEdaB1cp6wuo
  input 3101258: 922EMbZfqss92r2Czd6qqsxLBQh4x5FhDNw9FS2WxhAh >> BbsiNbFfJsRDwqF4JaiJ6sKecNuY4eWmEaDHcY6h6HuD
  output 4203: DJHX6f8PgeW5kcAmmvSTo9RHF2twBSMyEz5uiXiAwzHB << 3eVE92aEAsLYcBACXNu1yxoHVfTM8e8vmQC2zSApGRJX

*/