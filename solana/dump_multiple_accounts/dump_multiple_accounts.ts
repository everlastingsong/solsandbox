import { Connection, PublicKey } from "@solana/web3.js";

const RPC_ENDPOINT_URL_MAINNET1 = "https://api.mainnet-beta.solana.com";
const RPC_ENDPOINT_URL_MAINNET2 = "https://ssc-dao.genesysgo.net/";
const RPC_ENDPOINT_URL_DEVNET = "https://api.devnet.solana.com";

const RPC_ENDPOINT_URL = RPC_ENDPOINT_URL_MAINNET2;

async function main() {
  const argv = process.argv.slice(2); // 先頭2つは ts-node dump_multiple_count.ts のため不要
  const pubkeys = argv.map((b58) => new PublicKey(b58));

  const connection = new Connection(RPC_ENDPOINT_URL, "finalized");
  const account_infos = await connection.getMultipleAccountsInfo(pubkeys);

  const fs = require('fs')

  for (let i=0; i<pubkeys.length; i++) {
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
    const filename = pubkey.toBase58() + ".json";
    console.log(`${filename} ...`);
    fs.writeFileSync(filename, JSON.stringify(account_json));
  }
}

main();