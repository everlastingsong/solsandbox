import { PublicKey } from "@solana/web3.js";
import { TransactionBuilder } from "@orca-so/common-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";
import * as prompt from "prompt";
import { findMetadataPda } from "@metaplex-foundation/js";
import { DataV2, createCreateMetadataAccountV2Instruction } from "@metaplex-foundation/mpl-token-metadata"; // v2


// export ANCHOR_PROVIDER_URL=http://localhost:8899
// export ANCHOR_WALLET=~/.config/solana/id.json
const provider = AnchorProvider.env();
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());


async function main() {
  console.log("create Metadata...");

  // prompt
  const result = await prompt.get([
    "tokenMintAddress",
    "tokenName",
    "tokenSymbol",
    "tokenMetadataURI"
  ]);

  console.log(
    "setting...",
    "\n\ttokenMintAddress", result.tokenMintAddress,
    "\n\ttokenName", result.tokenName,
    "\n\ttokenSymbol", result.tokenSymbol,
    "\n\ttokenMetadataURI", result.tokenMetadataURI,
  );
  console.log("\nif the above is OK, enter YES");
  const yesno = (await prompt.get("yesno")).yesno;
  if (yesno !== "YES") {
    console.log("stopped");
    return;
  }

  await create_token_metadata(
    provider,
    new PublicKey(result.tokenMintAddress),
    result.tokenName,
    result.tokenSymbol,
    result.tokenMetadataURI,
  );
}

main();

// uri sample: https://token-creator-lac.vercel.app/token_metadata.json
// {
//   "name": "A test token",
//   "symbol": "TEST",
//   "description": "Fully for testing purposes only",
//   "image": "https://token-creator-lac.vercel.app/token_image.png"
// }
async function create_token_metadata(provider: AnchorProvider, mint: PublicKey, name: string, symbol: string, uri: string) {
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

  const tx_builder = new TransactionBuilder(provider.connection, provider.wallet).addInstruction({
    instructions: [create_metadata_account_v2_ix],
    cleanupInstructions: [],
    signers: [],
  })

  const signature = await tx_builder.buildAndExecute();
  console.log("signature", signature);
  await provider.connection.confirmTransaction(signature);
}


/*

SAMPLE EXECUTION LOG


*/