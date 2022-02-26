import { Keypair, Connection, sendAndConfirmTransaction } from "@solana/web3.js";
import { getOrca, OrcaPoolConfig, Network } from '@orca-so/sdk';
import Decimal from 'decimal.js';

// https://docs.solana.com/cluster/rpc-endpoints
const RPC_ENDPOINT_URL = "https://api.mainnet-beta.solana.com";

// code: 403, message: Access forbidden, contact your app developer or support@rpcpool.com.
// const RPC_ENDPOINT_URL = "https://orca.rpcpool.com ";

// My Wallet: ~/.config/solana/id1.json
const id_json_path = require('os').homedir() + "/.config/solana/id1.json";
const secret = Uint8Array.from(JSON.parse(require("fs").readFileSync(id_json_path)));
const wallet = Keypair.fromSecretKey(secret as Uint8Array);

async function do_swap(connection) {
    const orca = getOrca(connection, Network.MAINNET);
    const pool = orca.getPool(OrcaPoolConfig.USDC_USDT);

    const usdc_token = pool.getTokenA();
    const usdt_token = pool.getTokenB();

    const usdc_amount = new Decimal(0.001);
    const acceptable_slippage = new Decimal(5.0 /* % */); /* TOO LARGE for PRODUCTION! (DEV ONLY) */
    const quote = await pool.getQuote(usdc_token, usdc_amount, acceptable_slippage);
    const minimum_usdt_amount = quote.getMinOutputAmount();

    console.log("\t", `Swap ${usdc_amount.toString()} USDC for at least ${minimum_usdt_amount.toNumber()} USDT`);

    const swap_payload = await pool.swap(wallet, usdc_token, usdc_amount, minimum_usdt_amount);

    console.log("\t", new Date(), "Swap start...");
    const tx = await swap_payload.execute();
    console.log("\t", new Date(), `Swapped: ${tx}`);

    await connection.confirmTransaction(tx, "confirmed");
    console.log("\t", new Date(), `Confirmed: ${tx}`);

    await connection.confirmTransaction(tx, "finalized");
    console.log("\t", new Date(), `Finalized: ${tx}`);
}

async function main() {
    console.log("********************", "MAINNET", "********************")

    const commitment = "confirmed";
    const timeout_sec = 60;

    const connection_without_commitment = new Connection(RPC_ENDPOINT_URL);
    const connection_with_commitment = new Connection(
            RPC_ENDPOINT_URL,
            {
                commitment: commitment,
                confirmTransactionInitialTimeout: timeout_sec * 1000 /* ms */
            });

    console.log("CASE: connection_without_commitment");
    await do_swap(connection_without_commitment);
    console.log("CASE: connection_with_commitment (confirmed)");
    await do_swap(connection_with_commitment);
}

main();

/*

RESULT

CASE: connection_without_commitment
    Swap 0.001 USDC for at least 0.00095 USDT
    2022-02-26T00:24:49.170Z Swap start...
    2022-02-26T00:25:25.367Z Swapped: Ux6yenGg9rbuR2kGVGhjuuN7ojFjGypyRFCMfDdDavUqfaK4Bc3NYY9vfSfH8oCVJGCVvgYdYxFKCSoBJgUSUcK
    2022-02-26T00:25:25.902Z Confirmed: Ux6yenGg9rbuR2kGVGhjuuN7ojFjGypyRFCMfDdDavUqfaK4Bc3NYY9vfSfH8oCVJGCVvgYdYxFKCSoBJgUSUcK
    2022-02-26T00:25:26.156Z Finalized: Ux6yenGg9rbuR2kGVGhjuuN7ojFjGypyRFCMfDdDavUqfaK4Bc3NYY9vfSfH8oCVJGCVvgYdYxFKCSoBJgUSUcK

CASE: connection_with_commitment (confirmed)
    Swap 0.001 USDC for at least 0.00095 USDT
    2022-02-26T00:25:26.600Z Swap start...
    2022-02-26T00:25:34.127Z Swapped: 3vh9PPs6oVESAZ6Po3iz5ZNRWSbzy46vCFexEPUn56tbKGuGRByDo6BbrWeHsamfCbCceuePfQWHw2Z9ywWM4VbC
    2022-02-26T00:25:34.551Z Confirmed: 3vh9PPs6oVESAZ6Po3iz5ZNRWSbzy46vCFexEPUn56tbKGuGRByDo6BbrWeHsamfCbCceuePfQWHw2Z9ywWM4VbC
    2022-02-26T00:25:53.132Z Finalized: 3vh9PPs6oVESAZ6Po3iz5ZNRWSbzy46vCFexEPUn56tbKGuGRByDo6BbrWeHsamfCbCceuePfQWHw2Z9ywWM4VbC

*/
