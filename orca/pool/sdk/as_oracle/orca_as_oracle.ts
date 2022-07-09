import { Connection } from "@solana/web3.js";
import { getOrca, OrcaPoolConfig } from '@orca-so/sdk';
import Decimal from 'decimal.js';

const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net/"; // "https://api.mainnet-beta.solana.com";

const commitment = 'confirmed';
const connection = new Connection(RPC_ENDPOINT_URL, commitment);

async function main() {
    const fee = 0.003; // 0.3%

    const orca = getOrca(connection);
    const sol_usdc_pool = orca.getPool(OrcaPoolConfig.SOL_USDC);
    const orca_sol_pool = orca.getPool(OrcaPoolConfig.ORCA_SOL);

    const sol_amount = new Decimal(1);
    const usdc_sol_quote = await sol_usdc_pool.getQuote(sol_usdc_pool.getTokenA(), sol_amount);
    const usdc_per_sol = usdc_sol_quote.getExpectedOutputAmount().toNumber() / (1-fee); // not Minimum

    const orca_amount = new Decimal(1);
    const sol_orca_quote = await orca_sol_pool.getQuote(orca_sol_pool.getTokenA(), orca_amount);
    const sol_per_orca = sol_orca_quote.getExpectedOutputAmount().toNumber() / (1-fee); // not Minimum

    console.log("USDC/SOL price: ", usdc_per_sol);
    console.log("USDC/ORCA price", sol_per_orca * usdc_per_sol);
}

main();

/*

$ ts-node src/orca_as_oracle.ts 
USDC/SOL price:  98.87246840521564
USDC/ORCA price 2.5195740542685945

*/
