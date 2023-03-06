import { WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient, swapQuoteByInputToken, swapQuoteWithParams, SwapUtils, PriceMath, WhirlpoolIx } from "@orca-so/whirlpools-sdk";
import { Wallet, AnchorProvider } from "@project-serum/anchor";
import { PublicKey, Connection, Keypair, SystemProgram } from "@solana/web3.js";
import { Percentage, DecimalUtil, Instruction, TransactionBuilder } from "@orca-so/common-sdk";
import Decimal from "decimal.js";
import fetch from "node-fetch";

async function main() {
  // export ANCHOR_PROVIDER_URL=https://api.mainnet-beta.solana.com
  // export ANCHOR_WALLET=~/.config/solana/id.json

  const provider = AnchorProvider.env();
  const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
  const client = buildWhirlpoolClient(ctx);
  const userWallet = ctx.wallet;

  const SOL_USDC_8 = new PublicKey("7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm"); // 0.05% fee pool
  const SOL_USDC_64 = new PublicKey("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ"); // 0.3% fee pool
  const SOL_USDC_128 = new PublicKey("DFVTutNYXD8z4T5cRdgpso1G3sZqQvMHWpW2N99E4DvE"); // 1.0% fee pool

  const pool8 = await client.getPool(SOL_USDC_8);
  const pool64 = await client.getPool(SOL_USDC_64);
  const pool128 = await client.getPool(SOL_USDC_128);
  const pools = [pool8, pool64, pool128];

  const sol = pool8.getTokenAInfo();
  const usdc = pool8.getTokenBInfo();

  // get Coingecko SOL price
  const cgPrices = await (await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd`)).json();
  const cgSolPrice = new Decimal(cgPrices.solana.usd.toString());
  console.log("coingecko solPrice:", cgSolPrice.toString());

  // get Quote / input = 1 SOL
  const swapInputU64 = DecimalUtil.toU64(new Decimal("1"), sol.decimals);

  // slippage settings
  const acceptableSlippages = [
    Percentage.fromFraction(0, 1000), // 0%
    Percentage.fromFraction(1, 1000), // 0.1%
    Percentage.fromFraction(10, 1000), // 1%
  ];

  for (const acceptableSlippage of acceptableSlippages) {
    const quotes = await Promise.all(pools.map(async (pool) => {
    return await swapQuoteByInputToken(
      pool,
      sol.mint,
      swapInputU64,
      acceptableSlippage,
      ctx.program.programId,
      ctx.fetcher,
      true
    )}));

    console.log(`slippage setting: ${acceptableSlippage.toDecimal().mul(100)}%`);
    pools.forEach((pool, i) => {
      const quote = quotes[i];
      const estimatedAmountInDecimal = DecimalUtil.fromU64(quote.estimatedAmountIn, sol.decimals);
      const estimatedAmountOutDecimal = DecimalUtil.fromU64(quote.estimatedAmountOut, usdc.decimals);
      const estimatedPrice = estimatedAmountOutDecimal.div(estimatedAmountInDecimal);
      const difference = estimatedPrice.sub(cgSolPrice).div(cgSolPrice).mul(100).toFixed(3);
        
      console.log([
        `pool ${pool.getAddress()}`,
        `   estimatedAmountIn: ${quote.estimatedAmountIn.toString()}`,
        `   estimatedAmountOut: ${quote.estimatedAmountOut.toString()}`,
        `   otherAmountThreshold(out - slippage): ${quote.otherAmountThreshold.toString()}`,
        `   estimatedPrice: ${estimatedPrice.toFixed(usdc.decimals)}`,
        `   difference from coingecko: ${difference}%`,
      ].join("\n"));    
    });
    console.log("");
  }

  // I would like to trade 1 SOL for USDC and make sure I get at least cgSolPrice USDC!!!!!
  const quote = await swapQuoteByInputToken(
    pool8,
    sol.mint,
    swapInputU64,
    Percentage.fromFraction(0, 1000), // 0%
    ctx.program.programId,
    ctx.fetcher,
    true
  );
  quote.otherAmountThreshold = DecimalUtil.toU64(cgSolPrice.mul(DecimalUtil.fromU64(swapInputU64, sol.decimals)), usdc.decimals);
  console.log("otherAmountThreshold:", quote.otherAmountThreshold.toString());
  
  const builder = pool8.swap(quote);

  // execute ...
}

main();

/*

SAMPLE OUTPUT:
$ ts-node src/63a_with_external_price.ts 

coingecko solPrice: 20.74

slippage setting: 0%
pool 7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm
   estimatedAmountIn: 1000000000
   estimatedAmountOut: 20699488
   otherAmountThreshold(out - slippage): 20699488
   estimatedPrice: 20.699488
   difference from coingecko: -0.195%
pool HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
   estimatedAmountIn: 1000000000
   estimatedAmountOut: 20658631
   otherAmountThreshold(out - slippage): 20658631
   estimatedPrice: 20.658631
   difference from coingecko: -0.392%
pool DFVTutNYXD8z4T5cRdgpso1G3sZqQvMHWpW2N99E4DvE
   estimatedAmountIn: 1000000000
   estimatedAmountOut: 20620205
   otherAmountThreshold(out - slippage): 20620205
   estimatedPrice: 20.620205
   difference from coingecko: -0.577%

slippage setting: 0.1%
pool 7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm
   estimatedAmountIn: 1000000000
   estimatedAmountOut: 20699488
   otherAmountThreshold(out - slippage): 20678809
   estimatedPrice: 20.699488
   difference from coingecko: -0.195%
pool HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
   estimatedAmountIn: 1000000000
   estimatedAmountOut: 20658631
   otherAmountThreshold(out - slippage): 20637993
   estimatedPrice: 20.658631
   difference from coingecko: -0.392%
pool DFVTutNYXD8z4T5cRdgpso1G3sZqQvMHWpW2N99E4DvE
   estimatedAmountIn: 1000000000
   estimatedAmountOut: 20620205
   otherAmountThreshold(out - slippage): 20599605
   estimatedPrice: 20.620205
   difference from coingecko: -0.577%

slippage setting: 1%
pool 7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm
   estimatedAmountIn: 1000000000
   estimatedAmountOut: 20699488
   otherAmountThreshold(out - slippage): 20494542
   estimatedPrice: 20.699488
   difference from coingecko: -0.195%
pool HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
   estimatedAmountIn: 1000000000
   estimatedAmountOut: 20658631
   otherAmountThreshold(out - slippage): 20454090
   estimatedPrice: 20.658631
   difference from coingecko: -0.392%
pool DFVTutNYXD8z4T5cRdgpso1G3sZqQvMHWpW2N99E4DvE
   estimatedAmountIn: 1000000000
   estimatedAmountOut: 20620205
   otherAmountThreshold(out - slippage): 20416044
   estimatedPrice: 20.620205
   difference from coingecko: -0.577%

otherAmountThreshold: 20740000

*/
