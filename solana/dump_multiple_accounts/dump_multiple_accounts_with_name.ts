import { Connection, PublicKey } from "@solana/web3.js";

const RPC_ENDPOINT_URL_MAINNET1 = "https://api.mainnet-beta.solana.com";
const RPC_ENDPOINT_URL_MAINNET2 = "https://ssc-dao.genesysgo.net/";
const RPC_ENDPOINT_URL_DEVNET = "https://api.devnet.solana.com";

const RPC_ENDPOINT_URL = RPC_ENDPOINT_URL_MAINNET2;

async function main() {
  const argv = process.argv.slice(2); // 先頭2つは ts-node dump_multiple_count.ts のため不要

  // usage: ts-node dump_multiple_accounts_with_name.ts pubkey1 name1 pubkey2 name2 pubkey3 name3 ...
  const names: string[] = [];
  const pubkeys: PublicKey[] = [];
  while ( argv.length > 0 ) {
    const b58 = argv.shift();
    const name = argv.shift();
    names.push(name);
    pubkeys.push(new PublicKey(b58));
  }

  const connection = new Connection(RPC_ENDPOINT_URL, "finalized");
  const account_infos = await connection.getMultipleAccountsInfo(pubkeys);

  const fs = require('fs')

  for (let i=0; i<pubkeys.length; i++) {
    const name = names[i];
    const pubkey = pubkeys[i];
    const account_info = account_infos[i];

    // solana account --output json と同じ json を構成
    const account_json = {
      pubkey: pubkey.toBase58(),
      account: {
        lamports: account_info.lamports,
        data: [
          account_info.data.toString("base64"),
          "base64"
        ],
        owner: account_info.owner.toBase58(),
        executable: account_info.executable,
        rentEpoch: account_info.rentEpoch,
      },
    }

    // json 書き出し
    const filename = `${name}.${pubkey.toBase58()}.json`;
    console.log(`${filename} ...`);
    fs.writeFileSync(filename, JSON.stringify(account_json));
  }
}

main();

/*

# SOL/USDC whirlpool
ts-node ../dump_multiple_accounts_with_name.ts \
    HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ sol_usdc_wp_whirlpool \
    3YQm7ujtXWJU2e9jhp2QGHpnn1ShXn12QjvzMvDgabpX sol_usdc_wp_vault_a \
    2JTw1fE2wz1SymWUQ7UqpVtrTuKjcd6mWwYwUJUCh2rq sol_usdc_wp_vault_b \
    2tU3tKvj7RBxEatryyMYTUxBoLSSWCQXsdv1X6yce4T2 sol_usdc_wp_reward0_vault \
    93a168GhU5TKPri9jdkjysXhfb13z1BqGh5miGs2Pq6a sol_usdc_wp_ta_n50688 \
    C8o6QPGfuJD9XmNQY9ZTMXJE5qSDv4LHXaRA3D26GQ4M sol_usdc_wp_ta_n45056 \
    EVqGhR2ukNuqZNfvFFAitrX6UqrRm2r8ayKX9LH9xHzK sol_usdc_wp_ta_n39424 \
    2Eh8HEeu45tCWxY6ruLLRN6VcTSD7bfshGj7bZA87Kne sol_usdc_wp_ta_n33792 \
    A2W6hiA2nf16iqtbZt9vX8FJbiXjv3DBUG3DgTja61HT sol_usdc_wp_ta_n28160 \
    CEstjhG1v4nUgvGDyFruYEbJ18X8XeN4sX1WFCLt4D5c sol_usdc_wp_ta_n22528 \
    HoDhUt77EotPNLUfJuvCCLbmpiM1JR6WLqWxeDPR1xvK sol_usdc_wp_ta_n16896

# SAMO/USDC whirlpool
ts-node ../dump_multiple_accounts_with_name.ts \
    9vqYJjDUFecLL2xPUC4Rc7hyCtZ6iJ4mDiVZX7aFXoAe samo_usdc_wp_whirlpool \
    3xxgYc3jXPdjqpMdrRyKtcddh4ZdtqpaN33fwaWJ2Wbh samo_usdc_wp_vault_a \
    8xKCx3SGwWR6BUr9mZFm3xwZmCVMuLjXn9iLEU6784FS samo_usdc_wp_vault_b \
    DebZvpHUwAUmEfYBiZXpKUAFSqcMTXHe9vxcEaXYJ8er samo_usdc_wp_reward0_vault \
    DNeQkfQ9ajaW8jGKkkhPpaDAhcHEbmt7beHVWPksPU2k samo_usdc_wp_reward1_vault \
    ArnRmfQ49b2otrns9Kjug8fZXS8UdmKtxR2arpaevtxq samo_usdc_wp_ta_n129536 \
    Gad6jpBXSxFmSqcPSPTE9jABp9ragNc2VsdUCNWLEAMT samo_usdc_wp_ta_n123904 \
    4xM1zPj8ihLFUs2DvptGVZKkdACSZgNaa8zpBTApNk9G samo_usdc_wp_ta_n118272 \
    CHVTbSXJ3W1XEjQXx7BhV2ZSfzmQcbZzKTGZa6ph6BoH samo_usdc_wp_ta_n112640 \
    EE9AbRXbCKRGMeN6qAxxMUTEEPd1tQo67oYBQKkUNrfJ samo_usdc_wp_ta_n107008 \
    HpuNjdx9vTLYTAsxH3N6HCkguEkG9mCEpkrRugqyCPwF samo_usdc_wp_ta_n101376 \
    C9ahCpEXEysPgA3NGZVqZcVViBoXpoS68tbo2pC4FNHH samo_usdc_wp_ta_n95744

# Generated JSON
samo_usdc_wp_reward0_vault.DebZvpHUwAUmEfYBiZXpKUAFSqcMTXHe9vxcEaXYJ8er.json
samo_usdc_wp_reward1_vault.DNeQkfQ9ajaW8jGKkkhPpaDAhcHEbmt7beHVWPksPU2k.json
samo_usdc_wp_ta_n101376.HpuNjdx9vTLYTAsxH3N6HCkguEkG9mCEpkrRugqyCPwF.json
samo_usdc_wp_ta_n107008.EE9AbRXbCKRGMeN6qAxxMUTEEPd1tQo67oYBQKkUNrfJ.json
samo_usdc_wp_ta_n112640.CHVTbSXJ3W1XEjQXx7BhV2ZSfzmQcbZzKTGZa6ph6BoH.json
samo_usdc_wp_ta_n118272.4xM1zPj8ihLFUs2DvptGVZKkdACSZgNaa8zpBTApNk9G.json
samo_usdc_wp_ta_n123904.Gad6jpBXSxFmSqcPSPTE9jABp9ragNc2VsdUCNWLEAMT.json
samo_usdc_wp_ta_n129536.ArnRmfQ49b2otrns9Kjug8fZXS8UdmKtxR2arpaevtxq.json
samo_usdc_wp_ta_n95744.C9ahCpEXEysPgA3NGZVqZcVViBoXpoS68tbo2pC4FNHH.json
samo_usdc_wp_vault_a.3xxgYc3jXPdjqpMdrRyKtcddh4ZdtqpaN33fwaWJ2Wbh.json
samo_usdc_wp_vault_b.8xKCx3SGwWR6BUr9mZFm3xwZmCVMuLjXn9iLEU6784FS.json
samo_usdc_wp_whirlpool.9vqYJjDUFecLL2xPUC4Rc7hyCtZ6iJ4mDiVZX7aFXoAe.json

sol_usdc_wp_reward0_vault.2tU3tKvj7RBxEatryyMYTUxBoLSSWCQXsdv1X6yce4T2.json
sol_usdc_wp_ta_n16896.HoDhUt77EotPNLUfJuvCCLbmpiM1JR6WLqWxeDPR1xvK.json
sol_usdc_wp_ta_n22528.CEstjhG1v4nUgvGDyFruYEbJ18X8XeN4sX1WFCLt4D5c.json
sol_usdc_wp_ta_n28160.A2W6hiA2nf16iqtbZt9vX8FJbiXjv3DBUG3DgTja61HT.json
sol_usdc_wp_ta_n33792.2Eh8HEeu45tCWxY6ruLLRN6VcTSD7bfshGj7bZA87Kne.json
sol_usdc_wp_ta_n39424.EVqGhR2ukNuqZNfvFFAitrX6UqrRm2r8ayKX9LH9xHzK.json
sol_usdc_wp_ta_n45056.C8o6QPGfuJD9XmNQY9ZTMXJE5qSDv4LHXaRA3D26GQ4M.json
sol_usdc_wp_ta_n50688.93a168GhU5TKPri9jdkjysXhfb13z1BqGh5miGs2Pq6a.json
sol_usdc_wp_vault_a.3YQm7ujtXWJU2e9jhp2QGHpnn1ShXn12QjvzMvDgabpX.json
sol_usdc_wp_vault_b.2JTw1fE2wz1SymWUQ7UqpVtrTuKjcd6mWwYwUJUCh2rq.json
sol_usdc_wp_whirlpool.HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ.json

*/