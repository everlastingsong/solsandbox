import { Keypair, Connection, sendAndConfirmTransaction } from "@solana/web3.js";
import { getOrca, OrcaPoolConfig, OrcaU64, ORCA_TOKEN_SWAP_ID } from '@orca-so/sdk';
import { resolveOrCreateAssociatedTokenAddress, TransactionBuilder } from '@orca-so/sdk/dist/public/utils/web3';
import { createApprovalInstruction, createSwapInstruction } from '@orca-so/sdk/dist/public/utils/web3/instructions/pool-instructions';
import { createWSOLAccountInstructions } from '@orca-so/sdk/dist/public/utils/web3/instructions/token-instructions';
import { orcaSolPool, fttSolPool } from '@orca-so/sdk/dist/constants/pools'
import { Owner } from '@orca-so/sdk/dist/public/utils/web3/key-utils';
import Decimal from 'decimal.js';

const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net/"; // "https://api.mainnet-beta.solana.com";

const commitment = 'confirmed';
const connection = new Connection(RPC_ENDPOINT_URL, { commitment: commitment, confirmTransactionInitialTimeout: 90*1000 });

// wallet
const id_json_path = require('os').homedir() + "/.config/solana/id1.json";
const secret = Uint8Array.from(JSON.parse(require("fs").readFileSync(id_json_path)));
const wallet = Keypair.fromSecretKey(secret as Uint8Array);

// ORCA: route ORCA >>> SOL >>> FTT
async function main() {
  const swap_program_id = ORCA_TOKEN_SWAP_ID;
  const orca = getOrca(connection);

  const orca_sol_pool = orca.getPool(OrcaPoolConfig.ORCA_SOL);
  const ftt_sol_pool = orca.getPool(OrcaPoolConfig.FTT_SOL);
  const orca_sol_pool_params = orcaSolPool
  const ftt_sol_pool_params = fttSolPool
  const orca_token = orca_sol_pool.getTokenA();
  const wsol_token1 = orca_sol_pool.getTokenB();
  const wsol_token2 = ftt_sol_pool.getTokenB();
  const ftt_token = ftt_sol_pool.getTokenA();
  const owner = new Owner(wallet);
  const delegate = Keypair.generate(); // Temporary account

  // Input
  const input_orca_amount = OrcaU64.fromNumber(0.01, 6); /* 0.01 ORCA (decimals = 6) */
  const acceptable_slippage = new Decimal("0.1" /* % */);

  // SETUP
  const resolve_ftt_token_account = await resolveOrCreateAssociatedTokenAddress(connection, owner, ftt_token.mint);
  if ( resolve_ftt_token_account.instructions.length == 0 ) {
    console.log("setup is not required, wallet has associated token account for FTT.");
  }
  else {
    console.log("setup...");
    const setup_txbuilder = new TransactionBuilder(connection, wallet.publicKey, owner);
    setup_txbuilder.addInstruction(resolve_ftt_token_account);
    const setup_tx = await setup_txbuilder.build();
    const setup_txid = await sendAndConfirmTransaction(connection, setup_tx.transaction, setup_tx.signers);
    console.log("setup_txid", setup_txid);
  }

  // getQuote
  const quote_orca2wsol = await orca_sol_pool.getQuote(orca_token, input_orca_amount, acceptable_slippage);
  const output_wsol_amount = quote_orca2wsol.getMinOutputAmount();
  const quote_wsol2ftt = await ftt_sol_pool.getQuote(wsol_token2, output_wsol_amount, acceptable_slippage);
  const output_ftt_amount = quote_wsol2ftt.getMinOutputAmount();

  console.log("orca to wsol", input_orca_amount.toNumber(), " to ", output_wsol_amount.toNumber());
  console.log("wsol to ftt", output_wsol_amount.toNumber(), " to ", output_ftt_amount.toNumber());

  // SWAP
  const resolve_orca_token_account = await resolveOrCreateAssociatedTokenAddress(
    connection,
    owner,
    orca_token.mint
  );

  const rent_exempt_lamports = await connection.getMinimumBalanceForRentExemption(165 /* len of token account data */);
  const create_wsol_token_account = createWSOLAccountInstructions(
    wallet.publicKey,
    wsol_token1.mint,
    OrcaU64.fromNumber(0).toU64(),
    rent_exempt_lamports
  );
  
  const approve_orca_token_account = createApprovalInstruction(
    wallet.publicKey,
    input_orca_amount.toU64(),
    resolve_orca_token_account.address,
    delegate
  );

  const swap_orca2wsol = await createSwapInstruction(
    orca_sol_pool_params,
    owner,
    orca_token,
    resolve_orca_token_account.address,
    wsol_token1,
    create_wsol_token_account.address,
    input_orca_amount.toU64(),
    output_wsol_amount.toU64(),
    delegate.publicKey,
    swap_program_id
  );

  const approve_wsol_token_account = createApprovalInstruction(
    wallet.publicKey,
    output_wsol_amount.toU64(),
    create_wsol_token_account.address,
    delegate
  );

  const swap_wsol2ftt = await createSwapInstruction(
    ftt_sol_pool_params,
    owner,
    wsol_token2,
    create_wsol_token_account.address,
    ftt_token,
    resolve_ftt_token_account.address,
    output_wsol_amount.toU64(),
    output_ftt_amount.toU64(),
    delegate.publicKey,
    swap_program_id
  );

  console.log("swap...");
  const swap_txbuilder = new TransactionBuilder(connection, wallet.publicKey, owner);
  swap_txbuilder.addInstruction(create_wsol_token_account);
  swap_txbuilder.addInstruction(approve_orca_token_account);
  swap_txbuilder.addInstruction(swap_orca2wsol);
  swap_txbuilder.addInstruction(approve_wsol_token_account);
  swap_txbuilder.addInstruction(swap_wsol2ftt);
  const swap_tx = await swap_txbuilder.build();
  const swap_txid = await sendAndConfirmTransaction(connection, swap_tx.transaction, swap_tx.signers);
  console.log("swap_txid", swap_txid);
}

main();

/*

# SETUP
https://solscan.io/tx/2LhX41MHCxrXU23BkaxQXrVoBxeqKy7nQtLL738rdaxVs9FjLm9c91b6AhdPETLDwhXFBqg36hpNpT72vJiBmxwm

# SWAP
https://solscan.io/tx/jxkYHJKrxGSSKK1BNzKbHrzoEifT8gJiCVaqcWYqwtyYtQdhtueooEGZUMTF74zNUr7mRuG4vpcZuCT8AJfbGuP

*/
