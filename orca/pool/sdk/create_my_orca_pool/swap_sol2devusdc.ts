import { Keypair, Connection, PublicKey, sendAndConfirmRawTransaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getOrca, OrcaPoolConfig, Network } from '@orca-so/sdk';
import { OrcaPoolParams, CurveType } from '@orca-so/sdk/dist/model/orca/pool/pool-types';
import { Percentage } from '@orca-so/sdk/dist/public/utils/models/percentage';
import { OrcaPoolImpl } from '@orca-so/sdk/dist/model/orca/pool/orca-pool'
import * as Tokens from '@orca-so/sdk/dist/constants/tokens';

import Decimal from 'decimal.js';

const RPC_ENDPOINT_URL = "https://api.devnet.solana.com";

const commitment = 'confirmed';
const connection = new Connection(RPC_ENDPOINT_URL, { commitment: commitment, confirmTransactionInitialTimeout: 60*1000 });

// ~/.config/solana/id.json の秘密鍵をウォレットとして使う
const id_json_path = require('os').homedir() + "/.config/solana/id.json";
const secret = Uint8Array.from(JSON.parse(require("fs").readFileSync(id_json_path)));
const wallet = Keypair.fromSecretKey(secret as Uint8Array);

async function main() {
    // Devnet
    // const orca = getOrca(connection, Network.DEVNET);
    // Mainnet
    // const orca = getOrca(connection);
    // const orca_sol_pool = orca.getPool(OrcaPoolConfig.ORCA_SOL);

    // 運営が提供していないものはリストに入っていない
    // 直接プール実装(OrcaPoolImpl)のオブジェクトを生成する
    // https://github.com/orca-so/typescript-sdk/blob/main/src/constants/pools.ts
    // https://github.com/orca-so/typescript-sdk/blob/main/src/model/orca-factory.ts
    const devusdc_pubkey = new PublicKey("FMwbjM1stnTzi74LV4cS937jeSUds7mZDgcdgnJ1yBDw");
    const sol_devusdc_pool_params: OrcaPoolParams = Object.freeze({
        // create_devnet_orca_pool.ts で作った情報を入れる
        address: new PublicKey("DosfiDxjKb9b3XAuqwZ8cbg7F9iWtuew1PpKrkXUxi1V"),
        nonce: 255,
        authority: new PublicKey("EAj5W6dVep8xK5MXgu22sD28cBWLmGc3GL963sMVod44"),
        poolTokenMint: new PublicKey("7AEdkVjrFAfYMgJTRW7VAXyxiq7652t8eQWa5JcDL7fM"),
        poolTokenDecimals: 6,
        feeAccount: new PublicKey("67kMLL5ezDoxRD3PAtNP1LDE9oV4archrmNeePySHLQ"),
        tokenIds: [Tokens.solToken.mint.toString(), devusdc_pubkey.toString()],
        tokens: {
          [Tokens.solToken.mint.toString()]: {
            ...Tokens.solToken,
            addr: new PublicKey("C3cMYaFPADiGYJjdYTZ7PiuduMuuGLRV3Nsdo1N1m1xo"),
          },
          [devusdc_pubkey.toString()]: {
            // ...で展開されるJSONフィールドを直接入力
            // https://github.com/orca-so/typescript-sdk/blob/main/src/constants/tokens.ts
            tag: "DevUSDC",
            name: "Devnet USD Coin",
            mint: devusdc_pubkey,
            scale: 6,
            addr: new PublicKey("GKmRB5Zpq77aws79YDZ3Ekke4x5g6mBJqCq86vy36Yqe"),
          },
        },
        curveType: CurveType.ConstantProduct,
        feeStructure: {
          traderFee: Percentage.fromFraction(25, 10000),
          ownerFee: Percentage.fromFraction(5, 10000),
        },
    });

    const sol_devusdc_pool = new OrcaPoolImpl(connection, Network.DEVNET, sol_devusdc_pool_params);
    //const sol_devusdc_pool = new OrcaPoolImpl( Network.DEVNET, sol_devusdc_pool_params);
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
    //const tx = await sendAndConfirmTransaction(connection, swap_payload.transaction, swap_payload.signers, { commitment: commitment });
    const tx = await swap_payload.execute();
    console.log(`Swapped: ${tx}`);
}

main();

/*
Devnetにおける実行記録

sol_token mint So11111111111111111111111111111111111111112 deposit 6QRQnqSUDdgjWSpdXizK2hZ8HKfLiDogDaF1Edkq32Ev
devusdc_token mint FMwbjM1stnTzi74LV4cS937jeSUds7mZDgcdgnJ1yBDw deposit 3mdEwkuwPEQyEG2qRH23khcb6xDvqfmbtQ4k5VPr27h6
Swap 0.000005 SOL for at least 0.000497 DevUSDC
Swapped: 4a1UGEcMD4RMhu1qHw1CZGDRUyWjtrQZRmtDUjDWBcv6dpiXPEhnvafZSDywRuBXK7jV34Nu9peTb69UKCNqZ3g3
 */
