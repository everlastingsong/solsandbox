import { Connection } from "@solana/web3.js";
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

    // sign and send transaction by Phantom
    console.log("sign & send by Phantom!");
    const signature = await adapter.sendTransaction(payload.transaction, connection, {signers: payload.signers});

    await connection.confirmTransaction(signature);
    console.log(`Swapped: ${signature}`);
    window.alert(signature);
}

main();

// SAMPLE TX: https://solscan.io/tx/462NQa1zTev5mZQZNyJww5B84We6Qz8DRhfGAk99co1Fro9gD3qqv88gsXDpFbSgBZbJ5P4dhZaZfqhLNJrdr5Py?cluster=devnet
//
// PACKAGING: browserify main.ts -p tsify > bundle.js
//
// MEMO: ORCAの sdk と aquafarm が内包している spl-token の package.json のなかの下記の記述を変えないと下記のエラーが起きる (cjs用がない...)
//
// [BEFORE]
// "browser": {
//    "./lib/index.cjs.js": "./lib/index.browser.esm.js",
//    "./lib/index.esm.js": "./lib/index.browser.esm.js"
//  },
//
// [AFTER]
//  "browser": {
//    "./lib/index.cjs.js": "./lib/index.cjs.js",
//    "./lib/index.esm.js": "./lib/index.esm.js"
//  },
//
// SyntaxError: 'import' and 'export' may appear only with 'sourceType: module' (1:0) while parsing node_modules/@solana/spl-token/lib/index.browser.esm.js
// while parsing file: node_modules/@solana/spl-token/lib/index.browser.esm.js
//
// @solana/web3.js のバージョンは 1.41.6 をつかう。1.41.8 だと bundle.js 作成後にエラー (buffer-layout付近)
// $ npm ls
// with_phantom_adapter@1.0.0 /with_phantom_adapter
// ├── @orca-so/sdk@1.2.24
// ├── @solana/wallet-adapter-phantom@0.9.3
// ├── @solana/web3.js@1.41.6
// └── tsify@5.0.4
