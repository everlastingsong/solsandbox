import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import { getOrca, OrcaPoolConfig, Network } from '@orca-so/sdk';
import { OrcaPoolParams, CurveType } from '@orca-so/sdk/dist/model/orca/pool/pool-types';
import { Percentage } from '@orca-so/sdk/dist/public/utils/models/percentage';
import { OrcaPoolImpl } from '@orca-so/sdk/dist/model/orca/pool/orca-pool'
import * as Tokens from '@orca-so/sdk/dist/constants/tokens';

import Decimal from 'decimal.js';

const RPC_ENDPOINT_URL = "https://api.devnet.solana.com";

const commitment = 'confirmed';
const connection = new Connection(RPC_ENDPOINT_URL, commitment);

// MY WALLET SETTING
const id_json_path = require('os').homedir() + "/.config/solana/id.json";
const secret = Uint8Array.from(JSON.parse(require("fs").readFileSync(id_json_path)));
const wallet = Keypair.fromSecretKey(secret as Uint8Array);

async function main() {
    // MY USDC on DEVNET
    const devusdc_pubkey = new PublicKey("FMwbjM1stnTzi74LV4cS937jeSUds7mZDgcdgnJ1yBDw");

    // MY POOL PARAMS
    // https://github.com/orca-so/typescript-sdk/blob/main/src/constants/pools.ts
    // https://github.com/orca-so/typescript-sdk/blob/main/src/model/orca-factory.ts
    const sol_devusdc_pool_params: OrcaPoolParams = Object.freeze({
        // output of create_orca_pool.ts
        address: new PublicKey("3CbxF5jLJux7JwRceWkfLZZME8jFZWenvHwwo3ko2XKg"),
        nonce: 253,
        authority: new PublicKey("22b7ZrVsaY7jrvYeGv5DqbZR5rqYTRFocc97TYAawhjp"),
        poolTokenMint: new PublicKey("B3jS5cq1rVGXN4smYoAagq9UtYJcKxA6P5buaRBpsRXb"),
        poolTokenDecimals: 6,
        feeAccount: new PublicKey("2Fqu8eq8fFLjgyTB5cZAZt3bTMJw48oT2Np6dkJKhcB6"),
        tokenIds: [Tokens.solToken.mint.toString(), devusdc_pubkey.toString()],
        tokens: {
          [Tokens.solToken.mint.toString()]: {
            ...Tokens.solToken,
            addr: new PublicKey("6QRQnqSUDdgjWSpdXizK2hZ8HKfLiDogDaF1Edkq32Ev"),
          },
          [devusdc_pubkey.toString()]: {
            // https://github.com/orca-so/typescript-sdk/blob/main/src/constants/tokens.ts
            tag: "DevUSDC",
            name: "Devnet USD Coin",
            mint: devusdc_pubkey,
            scale: 6,
            addr: new PublicKey("3mdEwkuwPEQyEG2qRH23khcb6xDvqfmbtQ4k5VPr27h6"),
          },
        },
        curveType: CurveType.ConstantProduct,
        feeStructure: {
          traderFee: Percentage.fromFraction(25, 10000),
          ownerFee: Percentage.fromFraction(5, 10000),
        },
    });
    const sol_devusdc_pool = new OrcaPoolImpl(connection, Network.DEVNET, sol_devusdc_pool_params);
    console.log(sol_devusdc_pool);

    const sol_token = sol_devusdc_pool.getTokenA();
    const devusdc_token = sol_devusdc_pool.getTokenB();
    console.log("sol_token", "mint", sol_token.mint.toBase58(), "deposit", sol_token.addr.toBase58());
    console.log("devusdc_token", "mint", devusdc_token.mint.toBase58(), "deposit", devusdc_token.addr.toBase58());

    const sol_amount = new Decimal(0.000005);
    const quote = await sol_devusdc_pool.getQuote(sol_token, sol_amount);
    const devusdc_amount = quote.getMinOutputAmount();

    console.log(`Swap ${sol_amount.toString()} SOL for at least ${devusdc_amount.toNumber()} DevUSDC`);
    const swap_payload = await sol_devusdc_pool.swap(wallet, sol_token, sol_amount, devusdc_amount);
    const tx = await swap_payload.execute();
    console.log(`Swapped: ${tx}`);
}

main();

/*

sol_token mint So11111111111111111111111111111111111111112 deposit 6QRQnqSUDdgjWSpdXizK2hZ8HKfLiDogDaF1Edkq32Ev
devusdc_token mint FMwbjM1stnTzi74LV4cS937jeSUds7mZDgcdgnJ1yBDw deposit 3mdEwkuwPEQyEG2qRH23khcb6xDvqfmbtQ4k5VPr27h6
Swap 0.000005 SOL for at least 0.000497 DevUSDC
Swapped: 4a1UGEcMD4RMhu1qHw1CZGDRUyWjtrQZRmtDUjDWBcv6dpiXPEhnvafZSDywRuBXK7jV34Nu9peTb69UKCNqZ3g3
 */
