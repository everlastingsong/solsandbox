import { Keypair, PublicKey } from "@solana/web3.js";
import { WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient, WhirlpoolIx } from "@orca-so/whirlpools-sdk";
import { TransactionBuilder } from "@orca-so/common-sdk";
import { AnchorProvider } from "@project-serum/anchor";
import * as prompt from "prompt";

// export ANCHOR_PROVIDER_URL=http://localhost:8899
// export ANCHOR_WALLET=~/.config/solana/id.json
const provider = AnchorProvider.env();
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());


async function main() {
  const ctx = WhirlpoolContext.from(provider.connection, provider.wallet, ORCA_WHIRLPOOL_PROGRAM_ID);

  console.log("create WhirlpoolsConfig...");

  // prompt
  const result = await prompt.get([
    "feeAuthorityPubkey",
    "collectProtocolFeesAuthorityPubkey",
    "rewardEmissionsSuperAuthorityPubkey",
    "defaultProtocolFeeRatePer10000",
  ]);

  const configKeypair = Keypair.generate();

  const builder = new TransactionBuilder(ctx.connection, ctx.wallet);
  builder.addInstruction(WhirlpoolIx.initializeConfigIx(
    ctx.program,
    {
      whirlpoolsConfigKeypair: configKeypair,
      funder: ctx.wallet.publicKey,
      feeAuthority: new PublicKey(result.feeAuthorityPubkey),
      collectProtocolFeesAuthority: new PublicKey(result.collectProtocolFeesAuthorityPubkey),
      rewardEmissionsSuperAuthority: new PublicKey(result.rewardEmissionsSuperAuthorityPubkey),
      defaultProtocolFeeRate: Number.parseInt(result.defaultProtocolFeeRatePer10000),
    }));
  
  const sig = await builder.buildAndExecute();
  console.log("tx:", sig);
  console.log("whirlpoolsConfig address:", configKeypair.publicKey.toBase58());
}

main();

/*

SAMPLE EXECUTION LOG

$ ts-node src/tools/01_create_config.ts 
connection endpoint http://localhost:8899
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
create WhirlpoolsConfig...
prompt: feeAuthorityPubkey:  r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
prompt: collectProtocolFeesAuthorityPubkey:  r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
prompt: rewardEmissionsSuperAuthorityPubkey:  r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
prompt: defaultProtocolFeeRatePer10000:  300
tx: 5k733gttt65s2vAuABVhVcyGMkFDKRU3MQLhmxZ1crxCaxxXn2PsucntLN6rxqz3VeAv1jPTxfZoxUbkChbDngzT
whirlpoolsConfig address: 8raEdn1tNEft7MnbMQJ1ktBqTKmHLZu7NJ7teoBkEPKm

*/