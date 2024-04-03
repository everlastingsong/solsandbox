import { ComputeBudgetProgram, PublicKey, VersionedTransaction } from "@solana/web3.js";
import {
    WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    swapQuoteByInputToken, PriceMath, IGNORE_CACHE
} from "@orca-so/whirlpools-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";
import { DecimalUtil, Percentage } from "@orca-so/common-sdk";
import Decimal from "decimal.js";
import base58 from "bs58";

// THIS SCRIPT REQUIRES ENVIRON VARS!!!
// bash$ export ANCHOR_PROVIDER_URL=<RPC SERVER URL>
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts

const provider = AnchorProvider.env();
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());

async function main() {
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
    const fetcher = ctx.fetcher;
    const client = buildWhirlpoolClient(ctx);

    // get pool
    const whirlpoolPubkey = new PublicKey("Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE"); // SOL/USDC(4)
    const whirlpool = await client.getPool(whirlpoolPubkey);

    // get swap quote
    const tokenA = whirlpool.getTokenAInfo(); // SOL
    const tokenB = whirlpool.getTokenBInfo(); // USDC
    const inputToken = tokenA;
    const amountIn = new Decimal("0.0001");
    const outputToken = inputToken === tokenA ? tokenB : tokenA;

    const quote = await swapQuoteByInputToken(
      whirlpool,
      inputToken.mint,
      DecimalUtil.toBN(amountIn, inputToken.decimals),
      Percentage.fromFraction(10, 1000),
      ctx.program.programId,
      fetcher,
      IGNORE_CACHE,
    );

    // print quote
    console.log("aToB", quote.aToB);
    console.log("estimatedAmountIn", DecimalUtil.fromBN(quote.estimatedAmountIn, inputToken.decimals).toString());
    console.log("estimatedAmountOut", DecimalUtil.fromBN(quote.estimatedAmountOut, outputToken.decimals).toString());
    const rate = DecimalUtil.fromBN(quote.estimatedAmountIn, inputToken.decimals).div(DecimalUtil.fromBN(quote.estimatedAmountOut, outputToken.decimals));
    console.log(PriceMath.sqrtPriceX64ToPrice(whirlpool.getData().sqrtPrice, tokenA.decimals, tokenA.decimals));
    console.log(rate.toString());

    // build transaction
    const tx = await whirlpool.swap(quote);

    // add priority fee
    const estimatedComputeUnits = 100_000; // max 1_400_000
    const additionalFeeInLamports = 100_000; // 0.0001 SOL

    const setComputeUnitPriceIx = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: Math.floor((additionalFeeInLamports * 1_000_000) / estimatedComputeUnits),
    });
    const setComputeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
        units: estimatedComputeUnits,
    });

    tx.prependInstruction({
        instructions: [setComputeUnitLimitIx, setComputeUnitPriceIx],
        cleanupInstructions: [],
        signers: [],
    });

    // manual build
    const built = await tx.build({maxSupportedTransactionVersion: 0});

    const blockhash = await provider.connection.getLatestBlockhashAndContext("confirmed");
    const blockHeight = await provider.connection.getBlockHeight({commitment: "confirmed", minContextSlot: await blockhash.context.slot});

    // why 151: https://solana.com/docs/core/transactions/confirmation#how-does-transaction-expiration-work
    const transactionTTL = blockHeight + 151;

    const notSigned = built.transaction as VersionedTransaction;
    notSigned.message.recentBlockhash = blockhash.value.blockhash;

    if (built.signers.length > 0) notSigned.sign(built.signers);
    const signed = await provider.wallet.signTransaction(notSigned);
    const signature = base58.encode(signed.signatures[0]);

    // manual send and confirm
    const waitToConfirm = () => new Promise((resolve) => setTimeout(resolve, 5000));
    const waitToRetry = () => new Promise((resolve) => setTimeout(resolve, 2000));

    const numTry = 10;
    let landed = false;
    for (let i = 0; i < numTry; i++) {
        // check transaction TTL
        const blockHeight = await provider.connection.getBlockHeight("confirmed");
        if (blockHeight >= transactionTTL)  {
            console.log("transaction have been expired");
            break;
        }
        console.log("transaction is still valid,", transactionTTL - blockHeight, "blocks left (at most)");

        // send without retry on RPC server
        await provider.connection.sendRawTransaction(signed.serialize(), {skipPreflight: true, maxRetries: 0});
        console.log("sent, signature", signature);

        await waitToConfirm();

        // check signature status
        const sigStatus = await provider.connection.getSignatureStatus(signature);
        console.log("sigStatus", sigStatus.value?.confirmationStatus, sigStatus.context.slot);
        if (sigStatus.value?.confirmationStatus === "confirmed") {
            console.log("landed");
            landed = true;
            break;
        }

        // todo: need to increase wait time, but TTL is not long...
        await waitToRetry();
    }

    console.log("landed?", landed);
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/18a_swap_with_manual_retry.ts 

aToB true
estimatedAmountIn 0.0001
estimatedAmountOut 0.018837
0.1884537319415820598747389368885851061121
0.005308700960874873918352179221744439135743

transaction is still valid, 151 blocks left (at most)
sent, signature 664GbGMAKFKNvwwVcY6pbo1gGTELoPdRHipFYu73h4Mwb4r8iG5RxGhSaYkgxtnBQ1HCNXpP7FLNdYF7rb7rhNqg
sigStatus undefined 258062392

transaction is still valid, 136 blocks left (at most)
sent, signature 664GbGMAKFKNvwwVcY6pbo1gGTELoPdRHipFYu73h4Mwb4r8iG5RxGhSaYkgxtnBQ1HCNXpP7FLNdYF7rb7rhNqg
sigStatus confirmed 258062407

landed
landed? true

*/
