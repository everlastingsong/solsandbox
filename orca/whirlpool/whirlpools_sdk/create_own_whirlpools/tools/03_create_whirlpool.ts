import { Keypair, PublicKey } from "@solana/web3.js";
import { WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, PDAUtil, WhirlpoolIx, PoolUtil, PriceMath } from "@orca-so/whirlpools-sdk";
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

  console.log("create Whirlpool...");

  // prompt
  const result = await prompt.get([
    "whirlpoolsConfigPubkey",
    "tokenMintAPubkey",
    "tokenMintBPubkey",
    "feeTierPubkey",
  ]);

  const whirlpoolsConfigPubkey = new PublicKey(result.whirlpoolsConfigPubkey);
  const feeTierPubkey = new PublicKey(result.feeTierPubkey);
  const tokenMint0Pubkey = new PublicKey(result.tokenMintAPubkey);
  const tokenMint1Pubkey = new PublicKey(result.tokenMintBPubkey);

  const [tokenMintAAddress, tokenMintBAddress] = PoolUtil.orderMints(tokenMint0Pubkey, tokenMint1Pubkey);
  if (tokenMintAAddress.toString() !== tokenMint0Pubkey.toBase58()) {
    console.log("token order is inverted due to order restriction");
  }

  const tokenMintAPubkey = new PublicKey(tokenMintAAddress);
  const tokenMintBPubkey = new PublicKey(tokenMintBAddress);

  const feeTier = await ctx.fetcher.getFeeTier(feeTierPubkey);
  const tickSpacing = feeTier.tickSpacing;

  const pda = PDAUtil.getWhirlpool(
    ctx.program.programId,
    whirlpoolsConfigPubkey,
    tokenMintAPubkey,
    tokenMintBPubkey,
    tickSpacing
  );
  const tokenVaultAKeypair = Keypair.generate();
  const tokenVaultBKeypair = Keypair.generate();

  const mintA = await ctx.fetcher.getMintInfo(tokenMintAPubkey);
  const mintB = await ctx.fetcher.getMintInfo(tokenMintBPubkey);

  let initTickIndex, initPrice;
  while (true) {
    initTickIndex = Number.parseInt((await prompt.get(["initTickIndex"])).initTickIndex);
    initPrice = PriceMath.tickIndexToPrice(
      initTickIndex,
      mintA.decimals,
      mintB.decimals,
    );

    console.log(`is InitPrice ${initPrice.toFixed(6)} OK ? (if it is OK, enter OK)`);
    const ok = (await prompt.get("OK")).OK;
    if (ok === "OK") break; 
  }

  const initSqrtPrice = PriceMath.tickIndexToSqrtPriceX64(initTickIndex);

  console.log(
    "setting...",
    "\n\twhirlpoolsConfig", whirlpoolsConfigPubkey.toBase58(),
    "\n\ttokenMintA", tokenMintAPubkey.toBase58(),
    "\n\ttokenMintB", tokenMintBPubkey.toBase58(),
    "\n\ttickSpacing", tickSpacing,
    "\n\tinitPrice", initPrice.toFixed(mintB.decimals), "B/A",
    "\n\ttokenVaultA(gen)", tokenVaultAKeypair.publicKey.toBase58(),
    "\n\ttokenVaultB(gen)", tokenVaultBKeypair.publicKey.toBase58(),
  );
  console.log("\nif the above is OK, enter YES");
  const yesno = (await prompt.get("yesno")).yesno;
  if (yesno !== "YES") {
    console.log("stopped");
    return;
  }

  const builder = new TransactionBuilder(ctx.connection, ctx.wallet);
  builder.addInstruction(WhirlpoolIx.initializePoolIx(
    ctx.program,
    {
      whirlpoolPda: pda,
      funder: ctx.wallet.publicKey,
      whirlpoolsConfig: whirlpoolsConfigPubkey,
      tokenMintA: tokenMintAPubkey,
      tokenMintB: tokenMintBPubkey,
      tickSpacing,
      feeTierKey: feeTierPubkey,
      tokenVaultAKeypair,
      tokenVaultBKeypair,
      initSqrtPrice,
    }));
  
  const sig = await builder.buildAndExecute();
  console.log("tx:", sig);
  console.log("whirlpool address:", pda.publicKey.toBase58());
}

main();

/*

SAMPLE EXECUTION LOG

$ ts-node src/tools/03_create_whirlpool.ts 
connection endpoint http://localhost:8899
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
create Whirlpool...
prompt: whirlpoolsConfigPubkey:  8raEdn1tNEft7MnbMQJ1ktBqTKmHLZu7NJ7teoBkEPKm
prompt: tokenMintAPubkey:  So11111111111111111111111111111111111111112
prompt: tokenMintBPubkey:  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
prompt: feeTierPubkey:  BYUiw9LdPsn5n8qHQhL7SNphubKtLXKwQ4tsSioP6nTj
prompt: initTickIndex:  0
is InitPrice 999.999999 OK ? (if it is OK, enter OK)
prompt: OK:  
prompt: initTickIndex:  -1000
is InitPrice 904.841941 OK ? (if it is OK, enter OK)
prompt: OK:  
prompt: initTickIndex:  -10000
is InitPrice 367.897834 OK ? (if it is OK, enter OK)
prompt: OK:  
prompt: initTickIndex:  -50000
is InitPrice 6.739631 OK ? (if it is OK, enter OK)
prompt: OK:  
prompt: initTickIndex:  -40000
is InitPrice 18.319302 OK ? (if it is OK, enter OK)
prompt: OK:  
prompt: initTickIndex:  -38000
is InitPrice 22.375022 OK ? (if it is OK, enter OK)
prompt: OK:  OK
setting... 
        whirlpoolsConfig 8raEdn1tNEft7MnbMQJ1ktBqTKmHLZu7NJ7teoBkEPKm 
        tokenMintA So11111111111111111111111111111111111111112 
        tokenMintB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 
        tickSpacing 64 
        initPrice 22.375022 B/A 
        tokenVaultA(gen) G5JMrgXxUdjjGXPVMezddTZAr5x7L9N4Nix6ZBS1FAwB 
        tokenVaultB(gen) 3wwdjzY7mAsoG5yYN3Ebo58p1HdihCCSeo8Qbwx8Yg5r

if the above is OK, enter YES
prompt: yesno:  YES
tx: X7pyW22o6fi5x1YmjDEacabvbtPYrqLyXaJpv88JJ6xLBi9eXra9QhuqeYuRmLGh72NsmQ11Kf8YCe3rPzqcc9r
whirlpool address: CJBunHdcRxtYSWGxkw8KarDpoz78KtNeMni2yU51TbPq

*/