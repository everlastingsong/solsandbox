import { PublicKey } from "@solana/web3.js";
import { Provider } from "@project-serum/anchor";
import { TransactionBuilder } from "@orca-so/common-sdk";
import { findMetadataPda } from "@metaplex-foundation/js";
import { DataV2, createCreateMetadataAccountV2Instruction } from "@metaplex-foundation/mpl-token-metadata"; // v2

// bash$ export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts
const provider = Provider.env();
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());

// uri sample: https://token-creator-lac.vercel.app/token_metadata.json
// {
//   "name": "A test token",
//   "symbol": "TEST",
//   "description": "Fully for testing purposes only",
//   "image": "https://token-creator-lac.vercel.app/token_image.png"
// }
async function create_token_metadata(provider: Provider, mint: PublicKey, name: string, symbol: string, uri: string) {
  // REFERENCE: https://github.com/jacobcreech/Token-Creator/blob/master/src/components/CreateToken.tsx
  const metadata_pda = findMetadataPda(mint);
  const token_metadata: DataV2 = {
    name: name,
    symbol: symbol,
    uri: uri,
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null,
  };

  console.log("mint:", mint.toBase58());
  console.log("metadata:", metadata_pda.toBase58());
  console.log("name:", name);
  console.log("symbol:", symbol);
  console.log("uri:", uri);

  const create_metadata_account_v2_ix = createCreateMetadataAccountV2Instruction(
    {
      metadata: metadata_pda,
      mint: mint,
      mintAuthority: provider.wallet.publicKey,
      payer: provider.wallet.publicKey,
      updateAuthority: provider.wallet.publicKey,
    },
    {
      createMetadataAccountArgsV2: {
        data: token_metadata,
        isMutable: true,
      }
    }
  );

  const tx_builder = new TransactionBuilder(provider).addInstruction({
    instructions: [create_metadata_account_v2_ix],
    cleanupInstructions: [],
    signers: [],
  })

  const signature = await tx_builder.buildAndExecute();
  console.log("signature", signature);
  await provider.connection.confirmTransaction(signature);
}

async function main() {

  await create_token_metadata(
    provider,
    new PublicKey("FMwbjM1stnTzi74LV4cS937jeSUds7mZDgcdgnJ1yBDw"),
    "A test token",
    "TEST",
    "https://token-creator-lac.vercel.app/token_metadata.json"
  );

}

main();

/*

$ ts-node src/register_token_metadata.ts 
connection endpoint https://api.devnet.solana.com
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
mint: FMwbjM1stnTzi74LV4cS937jeSUds7mZDgcdgnJ1yBDw
metadata: xCQZoawBsP5ZTeQNGB3KZN28t2v463CJCeTTfWqzdut
name: A test token
symbol: TEST
uri: https://token-creator-lac.vercel.app/token_metadata.json
signature 5ZZYf2NLzw194rEb5RDGNtbKxvBqLDu9Wc4eBKrjagMJGZZiAXxy3qHapB75Y1Nn1qjwnabGDFN6R6tPw89sBb4h

*/
