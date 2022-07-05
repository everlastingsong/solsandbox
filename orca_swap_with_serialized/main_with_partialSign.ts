import { Connection, Transaction } from "@solana/web3.js";
import { getOrca, Network, OrcaPoolConfig } from "@orca-so/sdk";
import Decimal from "decimal.js";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";

const RPC_ENDPOINT_URL = "https://api.devnet.solana.com";
const commitment = 'confirmed';
const connection = new Connection(RPC_ENDPOINT_URL, commitment);

async function main() {
    console.log("create adapter");
    const adapter = new PhantomWalletAdapter();

    // connect to phantom
    try {
        console.log("connecting...");
        await adapter.connect();
    } catch (err) {
        console.log(err.message);
        return;
    }

    // setting
    const orca = getOrca(connection, Network.DEVNET);
    const orca_sol_pool = orca.getPool(OrcaPoolConfig.ORCA_SOL);
    const sol_token = orca_sol_pool.getTokenB();
    const sol_amount = new Decimal(0.0005);

    // get quote
    const quote = await orca_sol_pool.getQuote(sol_token, sol_amount);
    const usdc_amount = quote.getMinOutputAmount();
    console.log(`Swap ${sol_amount.toString()} SOL for at least ${usdc_amount.toNumber()} ORCA`);

    // get TX
    const payload = await orca_sol_pool.swap(adapter.publicKey, sol_token, sol_amount, usdc_amount);
    const transaction = payload.transaction;
    transaction.partialSign(...payload.signers);
    const serialized = transaction.serialize({requireAllSignatures: false});
    console.log("serialized", serialized);

    const deserialized = Transaction.from(serialized);

    // sign and send transaction by Phantom
    console.log("sign & send by Phantom!");
    const signature = await adapter.sendTransaction(deserialized, connection);

    await connection.confirmTransaction(signature);
    console.log(`Swapped: ${signature}`);
    window.alert(signature);
}

main();

// SAMPLE TX: https://explorer.solana.com/tx/3gBVRgfJHP3YDnx9YFstCve5N2bBmroivUhq85wNBMAXeH7F2QuxjNDjHuMgnavc4kmfgbLdtZVym3QGNYBBGhbz?cluster=devnet
// PACKAGING: browserify main_with_partialSign.ts -p tsify > bundle.js
