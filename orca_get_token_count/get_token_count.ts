import { Connection } from "@solana/web3.js";
import { getOrca, getTokenCount, OrcaPoolConfig } from '@orca-so/sdk';
import { orcaPoolConfigs } from "@orca-so/sdk/dist/constants";
import Decimal from 'decimal.js';

const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net/";

const commitment = 'confirmed';
const connection = new Connection(RPC_ENDPOINT_URL, commitment);

async function main() {
  const orca = getOrca(connection);
  const pool = orca.getPool(OrcaPoolConfig.SOL_USDC);
  const sol_token = pool.getTokenA();
  const usdc_token = pool.getTokenB();

  const {inputTokenCount, outputTokenCount} = await getTokenCount(
    connection,
    orcaPoolConfigs[OrcaPoolConfig.SOL_USDC],
    sol_token,
    usdc_token);

  console.log("sol token account:", sol_token.addr.toBase58());
  console.log("usdc token account:", usdc_token.addr.toBase58());

  const sol_amount = new Decimal(inputTokenCount.toString()).div(Decimal.pow(10, sol_token.scale));
  const usdc_amount = new Decimal(outputTokenCount.toString()).div(Decimal.pow(10, usdc_token.scale));
  console.log("sol_amount in pool:", sol_amount.toString(), "SOL");
  console.log("usdc_amount in pool:", usdc_amount.toString(), "USDC");

  console.log("rate: 1 SOL = ", usdc_amount.div(sol_amount).toFixed(6).toString(), "USDC");
}

main();

/*
SAMPLE OUTPUT:

$ ts-node src/get_token_count.ts
sol token account: ANP74VNsHwSrq9uUSjiSNyNWvf6ZPrKTmE4gHoNd13Lg
usdc token account: 75HgnSvXbWKZBpZHveX68ZzAhDqMzNDS29X6BGLtxMo1
sol_amount in pool: 1473058.017896147 SOL
usdc_amount in pool: 71956827.462269 USDC
rate: 1 SOL =  48.848604 USDC
*/
