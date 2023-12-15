import { PublicKey } from "@solana/web3.js";
import { WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, PDAUtil, WhirlpoolIx } from "@orca-so/whirlpools-sdk";
import { TransactionBuilder } from "@orca-so/common-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";
import * as prompt from "prompt";

// export ANCHOR_PROVIDER_URL=http://localhost:8899
// export ANCHOR_WALLET=~/.config/solana/id.json
const provider = AnchorProvider.env();
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());


async function main() {
  const ctx = WhirlpoolContext.from(provider.connection, provider.wallet, ORCA_WHIRLPOOL_PROGRAM_ID);

  console.log("create FeeTier...");

  // prompt
  const result = await prompt.get([
    "whirlpoolsConfigPubkey",
    "tickSpacing",
    "defaultFeeRatePer1000000",
  ]);

  const whirlpoolsConfigPubkey = new PublicKey(result.whirlpoolsConfigPubkey);
  const tickSpacing = Number.parseInt(result.tickSpacing);

  const pda = PDAUtil.getFeeTier(ctx.program.programId, whirlpoolsConfigPubkey, tickSpacing);
  const whirlpoolsConfig = await ctx.fetcher.getConfig(whirlpoolsConfigPubkey);

  const builder = new TransactionBuilder(ctx.connection, ctx.wallet);
  builder.addInstruction(WhirlpoolIx.initializeFeeTierIx(
    ctx.program,
    {
      feeTierPda: pda,
      funder: ctx.wallet.publicKey,
      whirlpoolsConfig: whirlpoolsConfigPubkey,
      feeAuthority: whirlpoolsConfig.feeAuthority,
      tickSpacing,
      defaultFeeRate: Number.parseInt(result.defaultFeeRatePer1000000),
    }));
  
  const sig = await builder.buildAndExecute();
  console.log("tx:", sig);
  console.log("feeTier address:", pda.publicKey.toBase58());
}

main();

/*

SAMPLE EXECUTION LOG

$ ts-node src/tools/02_create_feetier.ts 
connection endpoint http://localhost:8899
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
create FeeTier...
prompt: whirlpoolsConfigPubkey:  8raEdn1tNEft7MnbMQJ1ktBqTKmHLZu7NJ7teoBkEPKm
prompt: tickSpacing:  64
prompt: defaultFeeRatePer1000000:  3000
tx: gomSUyS88MbjVFTfTw2JPgQumVGttDYgm2Si7kqR5JYaqCgLA1fnSycRhjdAxXdfUWbpK1FZJQxKHgfNJrXgn2h
feeTier address: BYUiw9LdPsn5n8qHQhL7SNphubKtLXKwQ4tsSioP6nTj

*/