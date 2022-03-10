import { Keypair, Connection, sendAndConfirmTransaction } from "@solana/web3.js";
import { getOrca, OrcaPoolConfig, OrcaU64, ORCA_TOKEN_SWAP_ID } from '@orca-so/sdk';
import { resolveOrCreateAssociatedTokenAddress, TransactionBuilder } from '@orca-so/sdk/dist/public/utils/web3';
import { createApprovalInstruction, createSwapInstruction } from '@orca-so/sdk/dist/public/utils/web3/instructions/pool-instructions';
import { orcaUsdcPool, solUsdcPool } from '@orca-so/sdk/dist/constants/pools'
import { Owner } from '@orca-so/sdk/dist/public/utils/web3/key-utils';
import Decimal from 'decimal.js';

const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net/"; // "https://api.mainnet-beta.solana.com";

const commitment = 'confirmed';
const connection = new Connection(RPC_ENDPOINT_URL, commitment);

// wallet
const id_json_path = require('os').homedir() + "/.config/solana/id1.json";
const secret = Uint8Array.from(JSON.parse(require("fs").readFileSync(id_json_path)));
const wallet = Keypair.fromSecretKey(secret as Uint8Array);

// ORCA: route SOL >> USDC >> ORCA
async function main() {
  const swap_program_id = ORCA_TOKEN_SWAP_ID;
  const orca = getOrca(connection);

  const first_pool = orca.getPool(OrcaPoolConfig.SOL_USDC);
  const second_pool = orca.getPool(OrcaPoolConfig.ORCA_USDC);
  const first_pool_params = solUsdcPool
  const second_pool_params = orcaUsdcPool
  const from_token = first_pool.getTokenA();
  const middle_token1 = first_pool.getTokenB();
  const middle_token2 = second_pool.getTokenB();
  const to_token = second_pool.getTokenA();
  const owner = new Owner(wallet);
  const delegate = Keypair.generate(); // Temporary account

  // Input
  const input_from_amount = OrcaU64.fromNumber(0.001, from_token.scale); /* 0.001 SOL (decimals = 9) */
  const acceptable_slippage = new Decimal("0.1" /* % */);

  // SETUP
  const resolve_to_token_account = await resolveOrCreateAssociatedTokenAddress(connection, owner, to_token.mint);
  if ( resolve_to_token_account.instructions.length == 0 ) {
    console.log(`setup is not required, wallet has associated token account for ${to_token.name}.`);
  }
  else {
    console.log("setup...");
    const setup_txbuilder = new TransactionBuilder(connection, wallet.publicKey, owner);
    setup_txbuilder.addInstruction(resolve_to_token_account);
    const setup_tx = await setup_txbuilder.build();
    const setup_txid = await sendAndConfirmTransaction(connection, setup_tx.transaction, setup_tx.signers);
    console.log("setup_txid", setup_txid);
  }

  // getQuote
  const quote_first_swap = await first_pool.getQuote(from_token, input_from_amount, acceptable_slippage);
  const output_middle_amount = quote_first_swap.getMinOutputAmount();
  const quote_second_swap = await second_pool.getQuote(middle_token2, output_middle_amount, acceptable_slippage);
  const output_to_amount = quote_second_swap.getMinOutputAmount();

  console.log(`${from_token.name} to ${middle_token1.name}`, input_from_amount.toNumber(), " to ", output_middle_amount.toNumber());
  console.log(`${middle_token2.name} to ${to_token.name}`, output_middle_amount.toNumber(), " to ", output_to_amount.toNumber());

  // SWAP
  const resolve_from_token_account = await resolveOrCreateAssociatedTokenAddress(
    connection,
    owner,
    from_token.mint,
    input_from_amount.toU64() // used if from_token is (W)SOL
  );

  const resolve_middle_token_account = await resolveOrCreateAssociatedTokenAddress(
    connection,
    owner,
    middle_token1.mint,
    OrcaU64.fromNumber(0).toU64() // used if middle_token is (W)SOL
  )
  
  const approve_from_token_account = createApprovalInstruction(
    wallet.publicKey,
    input_from_amount.toU64(),
    resolve_from_token_account.address,
    delegate
  );

  const swap_first = await createSwapInstruction(
    first_pool_params,
    owner,
    from_token,
    resolve_from_token_account.address,
    middle_token1,
    resolve_middle_token_account.address,
    input_from_amount.toU64(),
    output_middle_amount.toU64(),
    delegate.publicKey,
    swap_program_id
  );

  const approve_middle_token_account = createApprovalInstruction(
    wallet.publicKey,
    output_middle_amount.toU64(),
    resolve_middle_token_account.address,
    delegate
  );

  const swap_second = await createSwapInstruction(
    second_pool_params,
    owner,
    middle_token2,
    resolve_middle_token_account.address,
    to_token,
    resolve_to_token_account.address,
    output_middle_amount.toU64(),
    output_to_amount.toU64(),
    delegate.publicKey,
    swap_program_id
  );

  console.log("swap...");
  const swap_txbuilder = new TransactionBuilder(connection, wallet.publicKey, owner);
  swap_txbuilder.addInstruction(resolve_from_token_account);
  swap_txbuilder.addInstruction(resolve_middle_token_account);
  swap_txbuilder.addInstruction(approve_from_token_account);
  swap_txbuilder.addInstruction(swap_first);
  swap_txbuilder.addInstruction(approve_middle_token_account);
  swap_txbuilder.addInstruction(swap_second);
  const swap_tx = await swap_txbuilder.build();
  const swap_txid = await sendAndConfirmTransaction(connection, swap_tx.transaction, swap_tx.signers);
  console.log("swap_txid", swap_txid);
}

main();

/*

$ ts-node src/swap_mainnet_route_sol_usdc_orca.ts 
setup is not required, wallet has associated token account for Orca.
Solana to USD Coin 0.001  to  0.081513
USD Coin to Orca 0.081513  to  0.038161
swap...
swap_txid 2fwzQNVvCYJVXduA8fikN6Xdb1eRwB1JEUicUxm6qkVPcmnVFXGPRbViCvsGmnuLf14UqTVyobwFA329Mm84TifD

https://solscan.io/tx/3qHGYSKxA29n1zwz6EVcDR32gQ9dznY4prDomUvkhJ1JMFjyMUGPFj2DdDxHJVrWjv3drU9dzYH1heW7oXh5GgoG
https://solscan.io/tx/2fwzQNVvCYJVXduA8fikN6Xdb1eRwB1JEUicUxm6qkVPcmnVFXGPRbViCvsGmnuLf14UqTVyobwFA329Mm84TifD

*/
