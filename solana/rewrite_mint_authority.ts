import { PublicKey } from "@solana/web3.js";
import invariant from "tiny-invariant";
import * as fs from "fs";

// usage: ts-node rewrite_mint_authority.ts <mint.json> <newAuthority>
function main() {
  const jsonfilePath = process.argv[2];
  const newAuthority = process.argv[3];

  const jsonfile = fs.readFileSync(jsonfilePath, "utf-8");
  const data = JSON.parse(jsonfile);

  invariant(data.account.data.length === 2);
  invariant(data.account.data[1] === "base64");

  const buffer = Buffer.from(data.account.data[0], "base64");
  const newAuthorityPubkey = new PublicKey(newAuthority);

  buffer.set(newAuthorityPubkey.toBuffer(), 4);

  fs.writeFileSync(jsonfilePath, JSON.stringify(data, null, 0));
}

main();