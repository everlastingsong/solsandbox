import { Keypair, Connection, PublicKey, sendAndConfirmRawTransaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getOrca, OrcaPoolConfig, Network, OrcaFarmConfig, Percentage } from '@orca-so/sdk';
import { orcaPoolConfigs } from "@orca-so/sdk/dist/constants/pools";
import { orcaFarmConfigs } from "@orca-so/sdk/dist/constants/farms";
import { OrcaPoolParams } from "@orca-so/sdk/dist/model/orca/pool/pool-types";
import { OrcaFarmParams } from "@orca-so/sdk/dist/model/orca/farm/farm-types";

function get_pool_config(mint: PublicKey): OrcaPoolParams {
  for (const p of Object.values(orcaPoolConfigs)) {
    if ( p.poolTokenMint.equals(mint) ) return p;
  }
  return undefined;
}

function get_farm_config(mint: PublicKey): OrcaFarmParams {
  for (const f of Object.values(orcaFarmConfigs)) {
    if ( f.farmTokenMint.equals(mint) ) return f;
  }
  return undefined;
}

function is_pool_lp_token(mint: PublicKey): boolean {
  const pool = get_pool_config(mint);
  return pool !== undefined;
}

function is_farm_token(mint: PublicKey): boolean {
  const farm = get_farm_config(mint);
  if (farm === undefined) return false;
  return is_pool_lp_token(farm.baseTokenMint); // farm -> pool
}

function is_double_dip_token(mint: PublicKey): boolean {
  const farm = get_farm_config(mint);
  if (farm === undefined) return false;
  return is_farm_token(farm.baseTokenMint); // farm -> farm -> pool (dd -> farm -> pool)
}

function get_pool_config_from_farm_token_mint(mint: PublicKey): OrcaPoolParams {
  if (!is_farm_token(mint)) return undefined;
  return get_pool_config(get_farm_config(mint).baseTokenMint); // farm -> pool
}

function get_pool_config_from_double_dip_token_mint(mint: PublicKey): OrcaPoolParams {
  if (!is_double_dip_token(mint)) return undefined;
  return get_pool_config(get_farm_config(get_farm_config(mint).baseTokenMint).baseTokenMint); // farm -> farm -> pool (dd -> farm -> pool)
}


// DUMMY definition to prevent the following compile error
// exports.defaultSlippagePercentage = percentage_1.Percentage.fromFraction(1, 1000); // 0.1%
const percentage = Percentage.fromFraction(0, 100);

async function main() {
  const RPC_ENDPOINT_URL = "https://api.mainnet-beta.solana.com";
  const TARGET_WALLET_PUBKEY = new PublicKey("r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6");

  const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");

  // get all token accounts in the wallet
  const token_accounts = await connection.getParsedTokenAccountsByOwner(TARGET_WALLET_PUBKEY, {programId: TOKEN_PROGRAM_ID});
  token_accounts.value.map((ta) => {
    /*
      {
        info: {
          isNative: false,
          mint: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
          owner: 'r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6',
          state: 'initialized',
          tokenAmount: {
            amount: '115865296633',
            decimals: 9,
            uiAmount: 115.865296633,
            uiAmountString: '115.865296633'
          }
        },
        type: 'account'
      }
     */
    const parsed_info = ta.account.data.parsed.info;
    const mint = new PublicKey(parsed_info.mint);

    // ignore 0 amount
    if ( parsed_info.tokenAmount.amount == 0 ) return;

    // detect orca standard pool related accounts
    let token_type = undefined;
    let pool_params: OrcaPoolParams = undefined;
    if ( is_pool_lp_token(mint) ) { token_type = "pool"; pool_params = get_pool_config(mint); }
    if ( is_farm_token(mint) ) { token_type = "farm"; pool_params = get_pool_config_from_farm_token_mint(mint); }
    if ( is_double_dip_token(mint) ) { token_type = "dd"; pool_params = get_pool_config_from_double_dip_token_mint(mint); }
    if ( token_type === undefined ) return;

    // print with pool name
    const token_a = pool_params.tokens[pool_params.tokenIds[0]];
    const token_b = pool_params.tokens[pool_params.tokenIds[1]];
    const pool_name = `${token_a.tag}/${token_b.tag}`;
    console.log(pool_name, token_type, parsed_info.tokenAmount.uiAmountString);
  })
}

main();

/*
SAMPLE OUTPUT

$ ts-node print_orca_std_pool_tokens.ts 
SOL/USDC pool 0.000123
SOL/USDC farm 0.361559
ETH/USDC farm 0.35894
ORCA/SOL farm 0.030528
mSOL/SOL farm 2.199469
BTC/USDC farm 0.163102
MNDE/mSOL dd 0.447354
USDC/USDT farm 0.150619
SHDW/USDC farm 1.13255
USDC/USDT pool 0.000062
stSOL/USDT farm 0.152737
stSOL/USDC dd 0.12577

*/