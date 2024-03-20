import {
  WhirlpoolContext,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  buildWhirlpoolClient,
  PDAUtil,
} from "@orca-so/whirlpools-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, ComputeBudgetProgram } from "@solana/web3.js";
import { Percentage } from "@orca-so/common-sdk";

async function main() {
  // bash$ export ANCHOR_PROVIDER_URL=<YOUR RPC ENDPOINT>
  // bash$ export ANCHOR_WALLET=~/.config/solana/id.json  (YOUR WALLET JSON FILE PATH)
  const provider = AnchorProvider.env();

  // bash$ ts-node 17a_close_position_with_priority_fee.ts <POSITION MINT ADDRESS> <PRIORITY FEE IN LAMPORTS>
  const positionMintAddress = new PublicKey(process.argv[2]);
  // https://solanacompass.com/statistics/fees (to check average priority fee, but we need to add more than the average)
  const priorityFeeInLamports = Number.parseInt(process.argv[3]);

  console.log("connection endpoint", provider.connection.rpcEndpoint);
  console.log("wallet", provider.wallet.publicKey.toBase58());
  console.log("position mint", positionMintAddress.toBase58());
  console.log("priority fee in lamports", priorityFeeInLamports);

  if (Number.isNaN(priorityFeeInLamports) || priorityFeeInLamports > 10_000_000) {
    console.log("please check args");
    return;
  }

  const ctx = WhirlpoolContext.from(
    provider.connection,
    provider.wallet,
    ORCA_WHIRLPOOL_PROGRAM_ID
  );
  const client = buildWhirlpoolClient(ctx);

  const positionAddress = PDAUtil.getPosition(ctx.program.programId, positionMintAddress).publicKey;
  console.log("position address", positionAddress.toBase58());

  const position = await client.getPosition(positionAddress);
  const pool = await client.getPool(position.getData().whirlpool);

  console.log("pool address", pool.getAddress().toBase58());

  const acceptableSlippage = Percentage.fromFraction(1, 100); // 1%
  const txs = await pool.closePosition(positionAddress, acceptableSlippage);

  // I expect tx num is 1
  console.log("tx num", txs.length);
  if (txs.length > 1) {
    console.log("we need to execute multiple transactions"); // rare case
    return;
  }

  const tx = txs[0];

  const computeUnitLimit = 1_400_000; // max
  const setComputeUnitPriceIx = ComputeBudgetProgram.setComputeUnitPrice({
    // Specify how many micro lamports to pay in addition for 1 CU
    microLamports: Math.floor((priorityFeeInLamports * 1_000_000) / computeUnitLimit),
  });
  const setComputeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: computeUnitLimit,
  });

  // Add instructions to the beginning of the transaction
  tx.prependInstruction({
    instructions: [setComputeUnitLimitIx, setComputeUnitPriceIx],
    cleanupInstructions: [],
    signers: [],
  });

  console.log("sending...");
  const signature = await tx.buildAndExecute();
  console.log("signature", signature);
}

main();

/*

[COMMAND]
ts-node src/17a_close_position_with_priority_fee.ts HWtffvkPfxKCwcpsnkJUcGYCBEv5YsXsau7G13xh3NYb 600000

[LOG]
connection endpoint https://nice.rpc
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
position mint HWtffvkPfxKCwcpsnkJUcGYCBEv5YsXsau7G13xh3NYb
priority fee in lamports 600000
position address nJpNKGkrS7BKrRNwxChfMQrRJ7G2TfUy4W1nVbNVRTk
pool address 7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm
tx num 1
sending...
signature 5aRRQEu7KvzPVGTM5tMuL4QaJ6Udk7pvhMyvi1VW2fcmTHobSrnU6d1mvzA89ksxcRPQ61u2hXUSiAopWKZg1jMp

[SOLSCAN]
https://solscan.io/tx/5aRRQEu7KvzPVGTM5tMuL4QaJ6Udk7pvhMyvi1VW2fcmTHobSrnU6d1mvzA89ksxcRPQ61u2hXUSiAopWKZg1jMp

*/
