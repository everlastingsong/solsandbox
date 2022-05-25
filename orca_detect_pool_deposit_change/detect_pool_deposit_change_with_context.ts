import { Connection, AccountInfo, Context } from '@solana/web3.js';
import { OrcaPoolConfig, Quote, Percentage, OrcaToken, getOrca, Network, deserializeAccount, OrcaU64 } from '@orca-so/sdk';
import { OrcaPoolParams } from "@orca-so/sdk/dist/model/orca/pool/pool-types";
import { QuotePoolParams, QuoteBuilderFactory } from "@orca-so/sdk/dist/model/quote/quote-builder";
import Decimal from 'decimal.js';
import { u64 } from "@solana/spl-token";
import { orcaPoolConfigs } from '@orca-so/sdk/dist/constants';

// Network fee
const LAMPORTS_PER_SIGNATURE = 5000;

const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net";

// get_quote (without connection, this calculation depends on args only)
function get_quote_with_pool_amounts(
  pool_params: OrcaPoolParams,
  token_a_amount: u64,
  token_b_amount: u64,
  input_token: OrcaToken,
  input_amount: u64,
  slippage: Decimal): Quote
  {  
  const token_a = pool_params.tokens[pool_params.tokenIds[0]];
  const token_b = pool_params.tokens[pool_params.tokenIds[1]];
  const forward = token_a.tag === input_token.tag;

  const input_pool_token   = forward ? token_a : token_b;
  const output_pool_token  = forward ? token_b : token_a;
  const input_pool_amount  = forward ? token_a_amount : token_b_amount;
  const output_pool_amount = forward ? token_b_amount : token_a_amount;

  // reference: https://github.com/orca-so/typescript-sdk/blob/main/src/model/orca/pool/orca-pool.ts (getQuoteWithPoolAmounts)
  const quote_params: QuotePoolParams = {
    inputToken: input_pool_token,
    outputToken: output_pool_token,
    inputTokenCount: input_pool_amount,
    outputTokenCount: output_pool_amount,
    feeStructure: pool_params.feeStructure,
    slippageTolerance: Percentage.fromDecimal(slippage),
    lamportsPerSignature: LAMPORTS_PER_SIGNATURE,
    amp: pool_params.amp !== undefined ? new u64(pool_params.amp) : undefined,
  };

  const quoteBuilder = QuoteBuilderFactory.getBuilder(pool_params.curveType);
  const quote = quoteBuilder?.buildQuote(quote_params, input_amount);
  if (quote == undefined) {
    throw new Error("Failed to get quote!");
  }
  return quote;
}

// ********************************************************************************
// callbacks and global state
let num_sol_account_listener_callbacked = 0;
let num_usdc_account_listener_callbacked = 0;
let sol_account_amount: u64;
let usdc_account_amount: u64;

function sol_account_listener(account_info: AccountInfo<Buffer>, context: Context) {
  // parse data into SPL Token Account
  const token_account = deserializeAccount(account_info.data);
  sol_account_amount = token_account.amount;

  if ( ++num_sol_account_listener_callbacked === num_usdc_account_listener_callbacked ) {
    print_quote(context);
  }
}

function usdc_account_listener(account_info: AccountInfo<Buffer>, context: Context) {
  // parse data into SPL Token Account
  const token_account = deserializeAccount(account_info.data);
  usdc_account_amount = token_account.amount;

  if ( num_sol_account_listener_callbacked === ++num_usdc_account_listener_callbacked ) {
    print_quote(context);
  }
}

function print_quote(context: Context) {
  const pool_params = orcaPoolConfigs[OrcaPoolConfig.SOL_USDC];
  const sol_token = pool_params.tokens[pool_params.tokenIds[0]];
  const quote = get_quote_with_pool_amounts(
    pool_params,
    sol_account_amount,
    usdc_account_amount,
    sol_token,
    OrcaU64.fromNumber(1, sol_token.scale).toU64(), // 1 SOL
    new Decimal(0) // exact (no slippage)
    );
  const rate = quote.getRate().toFixed(6);

  console.log(`ACCOUNT CHANGE DETECTED: slot: ${context.slot} sol amount: ${sol_account_amount} usdc amount: ${usdc_account_amount} rate: 1 SOL = ${rate} USDC`);
}
// ********************************************************************************

async function main() {
  // conservative setting
  const commitment = 'processed';

  const connection = new Connection(RPC_ENDPOINT_URL, { commitment: commitment });
  const orca = getOrca(connection, Network.MAINNET);
  const sol_usdc_pool = orca.getPool(OrcaPoolConfig.SOL_USDC);
  const sol_account = sol_usdc_pool.getTokenA().addr;
  const usdc_account = sol_usdc_pool.getTokenB().addr;

  // register listners (to detect change of SOL/USDC pool)
  console.log("start listening...");
  const sol_account_listener_id = connection.onAccountChange(sol_account, sol_account_listener, commitment);
  const usdc_account_listener_id = connection.onAccountChange(usdc_account, usdc_account_listener, commitment);

  // sleep...
  const sleep_sec = 10;
  await new Promise(resolve => setTimeout(resolve, sleep_sec*1000));

  // unregister listeners
  console.log("stop listening...");
  connection.removeAccountChangeListener(sol_account_listener_id);
  connection.removeAccountChangeListener(usdc_account_listener_id);
}

main();

/*
OUTPUT SAMPLE:

$ ts-node src/detect_pool_deposit_change_with_context.ts 
start listening...
ACCOUNT CHANGE DETECTED: slot: 135102740 sol amount: 1433692952294186 usdc amount: 71957408425096 rate: 1 SOL = 50.039644 USDC
ACCOUNT CHANGE DETECTED: slot: 135102741 sol amount: 1433692952294186 usdc amount: 71957408425096 rate: 1 SOL = 50.039644 USDC
ACCOUNT CHANGE DETECTED: slot: 135102742 sol amount: 1433692952294186 usdc amount: 71957408425096 rate: 1 SOL = 50.039644 USDC
ACCOUNT CHANGE DETECTED: slot: 135102743 sol amount: 1433692952294186 usdc amount: 71957408425096 rate: 1 SOL = 50.039644 USDC
ACCOUNT CHANGE DETECTED: slot: 135102746 sol amount: 1433696492814198 usdc amount: 71957231259045 rate: 1 SOL = 50.039398 USDC
ACCOUNT CHANGE DETECTED: slot: 135102747 sol amount: 1433684527807880 usdc amount: 71957835201057 rate: 1 SOL = 50.040235 USDC
stop listening...

*/
