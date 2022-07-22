import { Keypair, Connection, PublicKey, SystemProgram, Transaction, SYSVAR_RENT_PUBKEY, SYSVAR_CLOCK_PUBKEY, sendAndConfirmTransaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { getOrca, OrcaPoolConfig, Network } from '@orca-so/sdk';

import Decimal from 'decimal.js';

// solana-test-validator WITH related accounts
const RPC_ENDPOINT_URL = "http://localhost:8899";

const commitment = 'confirmed';
const connection = new Connection(RPC_ENDPOINT_URL, commitment);
console.log("Endpoint:", connection.rpcEndpoint);

// generate new wallet
const wallet = Keypair.generate();
console.log("Generated temporary wallet:", wallet.publicKey.toBase58());

async function main() {
  // airdrop SOL to generated wallet
  const airdrop_signature = await connection.requestAirdrop(wallet.publicKey, 10_000_000_000 /* lamports = 10 SOL */);
  console.log("airdrop_signature", airdrop_signature);
  await connection.confirmTransaction(airdrop_signature, "confirmed");

  const orca = getOrca(connection, Network.MAINNET); // using accounts on MAINNET with solana-test-validator

  const orca_sol_pool = orca.getPool(OrcaPoolConfig.ORCA_SOL);
  const orca_token = orca_sol_pool.getTokenA();
  const sol_token = orca_sol_pool.getTokenB();

  const sol_amount = new Decimal(1 /* SOL */);
  const quote = await orca_sol_pool.getQuote(sol_token, sol_amount);
  const usdc_amount = quote.getMinOutputAmount();

  console.log(`Swap ${sol_amount.toString()} SOL for at least ${usdc_amount.toNumber()} ORCA`);

  // temporary wallet swap 1 SOL for some ORCA
  // this transaction create ATA for Orca
  const swap_payload = await orca_sol_pool.swap(wallet, sol_token, sol_amount, usdc_amount);
  const swap_signature = await swap_payload.execute();
  console.log("swap_signature", swap_signature);
}

main();