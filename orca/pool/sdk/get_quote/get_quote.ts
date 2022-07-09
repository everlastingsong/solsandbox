import { Connection } from "@solana/web3.js";
import { getOrca, OrcaPoolConfig, OrcaU64, ORCA_TOKEN_SWAP_ID } from '@orca-so/sdk';
import Decimal from 'decimal.js';
import fetch from 'node-fetch'; // npm install node-fetch@2 (v2)

const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net/";

const commitment = 'confirmed';
const connection = new Connection(RPC_ENDPOINT_URL, commitment);

async function main() {
  const swap_program_id = ORCA_TOKEN_SWAP_ID;
  const orca = getOrca(connection);

  const pool = orca.getPool(OrcaPoolConfig.SOL_USDC);
  const sol_token = pool.getTokenA();
  const usdc_token = pool.getTokenB();

  // Input
  const input_amount = OrcaU64.fromNumber(1, sol_token.scale); /* 1 SOL */
  const acceptable_slippage = new Decimal("0.1" /* % */);

  // getQuote
  const quote = await pool.getQuote(sol_token, input_amount, acceptable_slippage);
  const min_output_amount = quote.getMinOutputAmount();
  console.log(`swap 1 SOL to at least ${min_output_amount.toDecimal()} USDC`);

  // USDC/USD from coingecko
  const coingecko = await (await fetch("https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd")).json();
  const usdcoin_usd = coingecko["usd-coin"].usd;
  console.log(`usdc/usd from coingecko: \$${usdcoin_usd}`);

  // USDC tokens with USD price
  const min_output_amount_in_usd = min_output_amount.toNumber() * usdcoin_usd;
  console.log(`swap 1 SOL to at least ${min_output_amount.toDecimal()} USDC (\$${min_output_amount_in_usd})`);
}

main();

/*
$ ts-node src/get_quote.ts 
swap 1 SOL to at least 106.096006 USDC
usdc/usd from coingecko: $0.999171
swap 1 SOL to at least 106.096006 USDC ($106.008052411026)
*/
