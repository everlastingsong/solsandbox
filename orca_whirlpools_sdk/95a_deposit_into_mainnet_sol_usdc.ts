import { PublicKey } from "@solana/web3.js";
import {
    WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient, Whirlpool, ORCA_WHIRLPOOLS_CONFIG,
    PDAUtil, PriceMath, increaseLiquidityQuoteByInputToken, IncreaseLiquidityInput
} from "@orca-so/whirlpools-sdk";
import { Provider } from "@project-serum/anchor";
import { DecimalUtil, Percentage } from "@orca-so/common-sdk";
import Decimal from "decimal.js";

// bash$ export ANCHOR_PROVIDER_URL=https://ssc-dao.genesysgo.net
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts
const provider = Provider.env();
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());

export interface TokenDefinition {
  symbol: string,
  mint: PublicKey,
  decimals: number,
}

interface IncreaseLiquidityQuote {
  lower_tick_index: number,
  upper_tick_index: number,
  quote: IncreaseLiquidityInput
}

function get_increase_liquidity_quote(
  whirlpool: Whirlpool,
  lower_price: Decimal,
  upper_price: Decimal,
  token_input: TokenDefinition,
  amount_in: Decimal,
  acceptable_slippage: Decimal,
  token_a: TokenDefinition,
  token_b: TokenDefinition,
): IncreaseLiquidityQuote {
    const whirlpool_data = whirlpool.getData();
    //const token_a = whirlpool.getTokenAInfo();
    //const token_b = whirlpool.getTokenBInfo(); // waiting for bugfix
    const tick_spacing = whirlpool_data.tickSpacing;

    console.log("mint", token_a.mint.toBase58(), token_b.mint.toBase58());
    console.log("decimals", token_a.decimals, token_b.decimals);

    const lower_tick_index = PriceMath.priceToInitializableTickIndex(lower_price, token_a.decimals, token_b.decimals, tick_spacing);
    const upper_tick_index = PriceMath.priceToInitializableTickIndex(upper_price, token_a.decimals, token_b.decimals, tick_spacing);
    console.log("lower & upper tick_index", lower_tick_index, upper_tick_index);

    // get quote
    const quote = increaseLiquidityQuoteByInputToken(
      token_input.mint,
      amount_in,
      lower_tick_index,
      upper_tick_index,
      Percentage.fromDecimal(acceptable_slippage),
      whirlpool
    );

    console.log("tokenA max input", DecimalUtil.fromU64(quote.tokenMaxA, token_a.decimals).toString());
    console.log("tokenB max input", DecimalUtil.fromU64(quote.tokenMaxB, token_b.decimals).toString());
    console.log("liquidity", quote.liquidityAmount.toString());
    return {lower_tick_index, upper_tick_index, quote};
}

async function open_position(
  ctx: WhirlpoolContext,
  whirlpool: Whirlpool,
  quote: IncreaseLiquidityQuote,
) {
  // get tx
  const { positionMint: position_mint, tx } = await whirlpool.openPosition(
    quote.lower_tick_index,
    quote.upper_tick_index,
    quote.quote
  );

  // execute transaction
  const signature = await tx.buildAndExecute();
  console.log("open_position signature", signature);
  console.log("position NFT", position_mint.toBase58());
  await ctx.connection.confirmTransaction(signature);  
}

async function main() {
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
    const fetcher = new AccountFetcher(ctx.connection);
    const client = buildWhirlpoolClient(ctx, fetcher);

    const config_pubkey = ORCA_WHIRLPOOLS_CONFIG;
    const SOL : TokenDefinition = {symbol: "SOL", mint: new PublicKey("So11111111111111111111111111111111111111112"), decimals: 9};
    const USDC: TokenDefinition = {symbol: "USDC", mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), decimals: 6};
    const tick_spacing = 64;

    // get pool
    const whirlpool_pubkey = PDAUtil.getWhirlpool(
      ctx.program.programId,
      config_pubkey,
      SOL.mint, USDC.mint, tick_spacing).publicKey;
    console.log("whirlpool_pubkey", whirlpool_pubkey.toBase58());
    const whirlpool = await client.getPool(whirlpool_pubkey);

    // deposit
    const quote = get_increase_liquidity_quote(
      whirlpool,
      new Decimal(25), new Decimal(100), // range
      SOL, new Decimal(0.01 /* SOL */),  // est input token
      new Decimal("0.1"),                // slippage
      SOL,  // tokenA
      USDC, // tokenB
    );

    await open_position(ctx, whirlpool, quote);
}

main();

/*
SAMPLE OUTPUT:

$ ts-node 95a_deposit_into_mainnet_sol_usdc.ts 
connection endpoint https://ssc-dao.genesysgo.net
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
whirlpool_pubkey HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
mint So11111111111111111111111111111111111111112 EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
decimals 9 6
lower & upper tick_index -36864 -22976
tokenA max input 0.01001
tokenB max input 0.470372
liquidity 7393048
open_position signature 61CAZNsm7iyoJUuFJC8qkWapncUutAHRmvk9Usar2N6YTrcosE6NCR6xSXEuPZVySNiaUdEkbcwijx4gWaBkyurh
position NFT 8851aUbfXe9xqMYBQRCjfLK4mDrFHTpXm6FEUyb1yt1D

https://solscan.io/tx/61CAZNsm7iyoJUuFJC8qkWapncUutAHRmvk9Usar2N6YTrcosE6NCR6xSXEuPZVySNiaUdEkbcwijx4gWaBkyurh?cluster=devnet

*/
