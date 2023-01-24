import {
  WhirlpoolContext,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  buildWhirlpoolClient,
  swapQuoteByInputToken,
  WhirlpoolIx,
  PDAUtil,
} from "@orca-so/whirlpools-sdk";
import { PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@project-serum/anchor";
import { DecimalUtil, Percentage, TransactionBuilder, resolveOrCreateATA } from "@orca-so/common-sdk";
import Decimal from "decimal.js";
import prompt from "prompt";

const SOL_USDC_8 = new PublicKey("7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm");
const CLH_USDC_64 = new PublicKey("5tvF8KfcaYoqYRz1CTTuvHKmCcTqeaSLXvQSGQkGy16U");

async function main() {
  // export ANCHOR_PROVIDER_URL=https://api.mainnet-beta.solana.com
  // export ANCHOR_WALLET=~/.config/solana/id.json

  const provider = AnchorProvider.env();
  console.log("connection endpoint", provider.connection.rpcEndpoint);
  console.log("wallet", provider.wallet.publicKey.toBase58());

  const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
  const client = buildWhirlpoolClient(ctx);

  const sol_usdc = await client.getPool(SOL_USDC_8);
  const clh_usdc = await client.getPool(CLH_USDC_64);

  const sol = sol_usdc.getTokenAInfo();
  const usdc = sol_usdc.getTokenBInfo();
  const clh = clh_usdc.getTokenAInfo();

  const user_input = new Decimal("0.001" /* SOL */);
  const quote_input = user_input.mul(0.995);

  const zero_slippage = Percentage.fromFraction(0, 100);

  const quote1 = await swapQuoteByInputToken(
    sol_usdc,
    sol.mint,
    DecimalUtil.toU64(quote_input, sol.decimals),
    zero_slippage,
    ORCA_WHIRLPOOL_PROGRAM_ID,
    ctx.fetcher,
    true
  );

  const quote2 = await swapQuoteByInputToken(
    clh_usdc,
    usdc.mint,
    quote1.estimatedAmountOut,
    zero_slippage,
    ORCA_WHIRLPOOL_PROGRAM_ID,
    ctx.fetcher,
    true,
  );

  const swap1_input_threshold = DecimalUtil.toU64(user_input, sol.decimals);
  const swap1_output_exact = quote1.estimatedAmountOut;
  const swap2_input_exact = swap1_output_exact;
  const swap2_output_threshold = quote2.estimatedAmountOut.muln(995).divn(1000);

  console.log(
    "estimate",
    DecimalUtil.fromU64(swap1_input_threshold, sol.decimals), "SOL",
    "-->",
    DecimalUtil.fromU64(swap1_output_exact, usdc.decimals), "USDC",
    "-->",
    DecimalUtil.fromU64(swap2_output_threshold, clh.decimals), "CLH",
  );

  // If you want not to use ATA for USDC, first create temporary USDC token account and finally close it...
  // This is an example, so I will not do that...

  const rent = await ctx.fetcher.getAccountRentExempt();
  const ta_sol = await resolveOrCreateATA(
    ctx.connection, ctx.wallet.publicKey, sol.mint, async () => rent,
    swap1_input_threshold // SOL input
  );
  const ta_usdc = await resolveOrCreateATA(
    ctx.connection, ctx.wallet.publicKey, usdc.mint, async () => rent,
  );
  const ta_clh = await resolveOrCreateATA(
    ctx.connection, ctx.wallet.publicKey, clh.mint, async () => rent,
  );

  const swap1_ix = WhirlpoolIx.swapIx(
    ctx.program,
    {
      ...quote1,
      // make quote as ExactOutput mode, and adjust slippage
      amountSpecifiedIsInput: false,
      amount: swap1_output_exact,
      otherAmountThreshold: swap1_input_threshold,
      // other parameters
      tokenOwnerAccountA: ta_sol.address,
      tokenOwnerAccountB: ta_usdc.address,
      tokenVaultA: sol_usdc.getData().tokenVaultA,
      tokenVaultB: sol_usdc.getData().tokenVaultB,
      oracle: PDAUtil.getOracle(ORCA_WHIRLPOOL_PROGRAM_ID, sol_usdc.getAddress()).publicKey,
      tokenAuthority: ctx.wallet.publicKey,
      whirlpool: sol_usdc.getAddress(),
    }
  );

  const swap2_ix = WhirlpoolIx.swapIx(
    ctx.program,
    {
      ...quote2,
      // make quote as ExactInput mode, and adjust slippage
      amountSpecifiedIsInput: true,
      amount: swap2_input_exact,
      otherAmountThreshold: swap2_output_threshold,
      // other parameters
      tokenOwnerAccountA: ta_clh.address,
      tokenOwnerAccountB: ta_usdc.address,
      tokenVaultA: clh_usdc.getData().tokenVaultA,
      tokenVaultB: clh_usdc.getData().tokenVaultB,
      oracle: PDAUtil.getOracle(ORCA_WHIRLPOOL_PROGRAM_ID, clh_usdc.getAddress()).publicKey,
      tokenAuthority: ctx.wallet.publicKey,
      whirlpool: clh_usdc.getAddress(),
    }
  );

  const builder = new TransactionBuilder(ctx.connection, ctx.wallet);
  builder
    .addInstruction(ta_sol)
    .addInstruction(ta_usdc)
    .addInstruction(ta_clh)
    .addInstruction(swap1_ix)
    .addInstruction(swap2_ix);

  console.log("if you want to send Tx, enter YES");
  const { yesno } = await prompt.get(["yesno"]);
  if (yesno !== "YES") return;

  const signature = await builder.buildAndExecute();

  console.log("signature:", signature);  
}

main();

/*

$ ts-node src/67a_2step_swap.ts 
connection endpoint https://api.mainnet-beta.solana.com
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
estimate 0.001 SOL --> 0.024117 USDC --> 9.28771 CLH
if you want to send Tx, enter YES
prompt: yesno:  YES
signature: 9DH7hdVgHLASCRQXkrfdBPuSk84j4EFLZhVVSQtBDNZn7oo9rgQxmkJqSPEwqs4FqA1PUvv3RFChG9aehPmS1Pf

https://solscan.io/tx/9DH7hdVgHLASCRQXkrfdBPuSk84j4EFLZhVVSQtBDNZn7oo9rgQxmkJqSPEwqs4FqA1PUvv3RFChG9aehPmS1Pf

*/
