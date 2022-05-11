import { getOrca, Network, OrcaPoolConfig } from "@orca-so/sdk";
import { OrcaWhirlpoolClient, OrcaNetwork } from "@orca-so/whirlpool-sdk";
import { solToken, usdcToken } from "@orca-so/sdk/dist/constants/tokens";
import Decimal from "decimal.js";
import { BN } from "@project-serum/anchor";
import { Connection } from "@solana/web3.js";

function to_scaled(amount: BN, scale: number): string {
  const pow10 = new Decimal(10).pow(scale);
  return new Decimal(amount.toString()).div(pow10).toFixed(scale);
}

async function main() {
  // SOL/USDC whirlpool
  const orca = new OrcaWhirlpoolClient({ network: OrcaNetwork.MAINNET });
  const poolAddress = await orca.pool.derivePDA(solToken.mint, usdcToken.mint, 64).publicKey;

  const poolData = await orca.getPool(poolAddress);
  if (!poolData) {
    return;
  }
  console.log("(Whirlpool) SOL price", poolData.price);


  // SOL/USDC normal pool
  const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net";
  const commitment = 'confirmed';
  const connection = new Connection(RPC_ENDPOINT_URL, commitment);
  const orca_normal = getOrca(connection, Network.MAINNET);
  const sol_usdc_pool = orca_normal.getPool(OrcaPoolConfig.SOL_USDC);

  const quote = await sol_usdc_pool.getQuote(solToken, new Decimal("1"), new Decimal("0"));
  console.log("(normal pool) SOL price", quote.getRate());
}

main();

/*
$ ts-node get_orca_sol_price.ts
(Whirlpool) SOL price 65.36164884368515107987263032668693336793
(normal pool) SOL price 65.12523
*/
