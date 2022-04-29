import { Connection } from "@solana/web3.js";
import { getOrca, OrcaPoolConfig, deserializeAccount } from '@orca-so/sdk';

const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net/";

const commitment = 'confirmed';
const connection = new Connection(RPC_ENDPOINT_URL, commitment);

async function main() {
  // reference: https://github.com/orca-so/typescript-sdk/blob/main/src/public/utils/web3/get-token-count.ts

  const orca = getOrca(connection);
  const orca_sol_pool = orca.getPool(OrcaPoolConfig.ORCA_SOL);
  const samo_usdc_pool = orca.getPool(OrcaPoolConfig.SAMO_USDC);

  // get data of 4 accounts with 1 RPC (ATTENTION: max 100 accounts (depends RPC setting))
  const account_infos = await connection.getMultipleAccountsInfo([
    orca_sol_pool.getTokenA().addr,  // ORCA of ORCA/SOL pool
    orca_sol_pool.getTokenB().addr,  // SOL of ORCA/SOL pool
    samo_usdc_pool.getTokenA().addr, // SAMO of SAMO/USDC pool
    samo_usdc_pool.getTokenB().addr, // USDC of SAMO/USDC pool
  ]);

  // parse data into SPL Token Account
  const token_accounts = account_infos.map((info) =>
    info != undefined ? deserializeAccount(<Buffer>info.data) : undefined
  );

  // print token count (ORCA of ORCA/SOL, SOL of ORCA/SOL, SAMO of SAMO/USDC, USDC of SAMO/USDC)
  // cross-check: https://api.orca.so/allPools
  token_accounts.map((token_account) => console.log(token_account.amount.toString()));
}

main();
