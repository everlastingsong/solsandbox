import { Keypair, Connection, sendAndConfirmTransaction } from "@solana/web3.js";
import { getOrca, OrcaPoolConfig, Network } from '@orca-so/sdk';
import Decimal from 'decimal.js';

const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net";
const wallet = Keypair.generate();

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");

  const orca = getOrca(connection, Network.MAINNET);
  const pool = orca.getPool(OrcaPoolConfig.SAMO_USDC);

  const samo_token = pool.getTokenA();
  const usdc_token = pool.getTokenB();
  const usdc_amount = new Decimal(0.001);
  const acceptable_slippage = new Decimal(1.0 /* % */);
  const quote = await pool.getQuote(usdc_token, usdc_amount, acceptable_slippage);
  const minimum_samo_amount = quote.getMinOutputAmount();
  console.log("\t", `Swap ${usdc_amount.toString()} USDC for at least ${minimum_samo_amount.toNumber()} SAMO`);

  const swap_payload = await pool.swap(wallet, usdc_token, usdc_amount, minimum_samo_amount);
  console.log(swap_payload.transaction.instructions);
}

main();
