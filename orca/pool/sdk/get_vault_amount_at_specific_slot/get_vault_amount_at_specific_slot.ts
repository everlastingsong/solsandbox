import { Connection, PublicKey, ParsedTransactionWithMeta, TokenAmount } from "@solana/web3.js";
import * as prompt from "prompt";

const ORCA_SOL_POOL = new PublicKey("2ZnVuidTHpi5WWKUwFXauYGhvdT9jRKYv5MDahtbwtYr");
const ORCA_SOL_POOL_VAULT_ORCA = new PublicKey("AioST8HKQJRqjE1mknk4Rydc8wVADhdQwRJmAAYX1T6Z");
const ORCA_SOL_POOL_VAULT_SOL = new PublicKey("73zdy95DynZP4exdpuXTDsexcrWbDJX9TFi2E6CDzXh4");

async function main() {
  // bash$ export RPC_ENDPOINT_URL=<your-rpc-endpoint-url>
  const RPC_ENDPOINT_URL = process.env.RPC_ENDPOINT_URL;

  const connection = new Connection(RPC_ENDPOINT_URL, "finalized");

  // print current vault amount
  const curr_orca = await connection.getTokenAccountBalance(ORCA_SOL_POOL_VAULT_ORCA);
  const curr_sol = await connection.getTokenAccountBalance(ORCA_SOL_POOL_VAULT_SOL);
  console.log(
    "current vault amounts:",
    curr_orca.value.uiAmountString, "ORCA",
    "+",
    curr_sol.value.uiAmountString, "SOL",
  );

  // input slot number
  const latest_context = await connection.getLatestBlockhashAndContext();
  const latest_slot = latest_context.context.slot;
  console.log("current latest slot:", latest_slot);
  const {slot_number} = await prompt.get(["slot_number"]);
  const slot = Number.parseInt(slot_number);

  // get block time and tx signatures
  if (!(await is_available_slot(connection, slot))) {
    console.log(`slot ${slot} is not available (skipped or missing in log-term storage)`);
    return;
  }
  const block_unixtime = await connection.getBlockTime(slot);
  const block_datetime = new Date(block_unixtime * 1000);
  const block_signatures = await connection.getBlockSignatures(slot);
  console.log(
    `at slot ${slot}(${block_datetime})`,
    `${block_signatures.signatures.length} transactions found`,
  );

  // find transactions related to ORCA/SOL pool
  // use the first signature as "before" parameter
  const first_signature = block_signatures.signatures[0];
  const pool_signatures = await connection.getSignaturesForAddress(
    ORCA_SOL_POOL,
    {before: first_signature, limit: 10},
  );
  const pool_transactions = await connection.getParsedTransactions(
    pool_signatures.map((s) => s.signature),
    {maxSupportedTransactionVersion: 2},
  );

  // find postTokenBalances including ORCA vault and SOL vault
  let found_tx: ParsedTransactionWithMeta = undefined;
  let orca_vault_amount: TokenAmount = undefined;
  let sol_vault_amount: TokenAmount = undefined;
  for (const tx of pool_transactions) {
    orca_vault_amount = get_token_amount(tx, ORCA_SOL_POOL_VAULT_ORCA);
    sol_vault_amount = get_token_amount(tx, ORCA_SOL_POOL_VAULT_SOL);
    if (orca_vault_amount && sol_vault_amount) {
      found_tx = tx;
      break;
    }
  }
  if (!found_tx) {
    console.log(`cannot find related transactions before slot ${slot}`);
    return;
  }

  // print result
  const tx_datetime = new Date(found_tx.blockTime * 1000);
  console.log(
    `at slot ${found_tx.slot}(${tx_datetime})`,
    found_tx.transaction.signatures[0],
    `found`,
  );
  console.log(
    `vault amounts at slot ${slot}:`,
    orca_vault_amount.uiAmountString, "ORCA",
    "+",
    sol_vault_amount.uiAmountString, "SOL",
  );
}

async function is_available_slot(connection: Connection, slot: number): Promise<boolean> {
  try {
    const block_unixtime = await connection.getBlockTime(slot);
    return true;
  }
  catch {}
  return false;
}

function get_token_amount(tx: ParsedTransactionWithMeta, ta: PublicKey): TokenAmount|undefined {
  for (const b of tx.meta.postTokenBalances) {
    const account = tx.transaction.message.accountKeys[b.accountIndex].pubkey;
    if (account.equals(ta)) return b.uiTokenAmount;
  }
  return undefined;
}

main();

/*

$ ts-node src/get_vault_amount_at_specific_slot.ts 
current vault amounts: 378820.78716 ORCA + 14107.392692963 SOL
current latest slot: 170575390
prompt: slot_number:  170575390
at slot 170575390(Tue Jan 03 2023 16:39:14 GMT+0900 (JST)) 2616 transactions found
at slot 170575288(Tue Jan 03 2023 16:38:24 GMT+0900 (JST)) jG6LhmHzDJnqu1CFooZNnDivphECa8zN4fm2mRMbC35YsfTt68bKoY7JRkN1szsnrg1hsXwoRtfdA3AN4ahx1PE found
vault amounts at slot 170575390: 378820.78716 ORCA + 14107.392692963 SOL

$ ts-node src/get_vault_amount_at_specific_slot.ts 
current vault amounts: 378820.78716 ORCA + 14107.392692963 SOL
current latest slot: 170575436
prompt: slot_number:  170000000
at slot 170000000(Sat Dec 31 2022 13:05:20 GMT+0900 (JST)) 3981 transactions found
at slot 169999906(Sat Dec 31 2022 13:04:36 GMT+0900 (JST)) 5PZeMP9qLE2qNVu41NzrAoNRGwQuSfzSqD9XeZg2mjRTpsnTZEDM7Cvf7LtnwUfFMjKzxi2ESuXKKPCLX3155gEz found
vault amounts at slot 170000000: 349466.898539 ORCA + 15380.029838596 SOL

$ ts-node src/get_vault_amount_at_specific_slot.ts 
current vault amounts: 378820.78716 ORCA + 14107.392692963 SOL
current latest slot: 170575529
prompt: slot_number:  120000000
at slot 120000000(Wed Feb 09 2022 12:48:12 GMT+0900 (JST)) 1638 transactions found
at slot 119999978(Wed Feb 09 2022 12:47:59 GMT+0900 (JST)) 5g3hwJxSD2CgzJJbX2vGD7v7TRCuzCP896aJ5m5rW74FuegL9frR2c5Hcetr8gapyf4ZTcPzuVNbzJZ8jBdC8bwz found
vault amounts at slot 120000000: 3939387.339594 ORCA + 121298.551928988 SOL

$ ts-node src/get_vault_amount_at_specific_slot.ts 
current vault amounts: 380086.185699 ORCA + 14060.566425943 SOL
current latest slot: 170576645
prompt: slot_number:  170575772
slot 170575772 is not available (skipped or missing in log-term storage)

$ ts-node src/get_vault_amount_at_specific_slot.ts 
current vault amounts: 380081.210243 ORCA + 14060.751039736 SOL
current latest slot: 170576827
prompt: slot_number:  90000000
at slot 90000000(Wed Aug 04 2021 09:32:09 GMT+0900 (JST)) 1254 transactions found
cannot find related transactions before slot 90000000

*/