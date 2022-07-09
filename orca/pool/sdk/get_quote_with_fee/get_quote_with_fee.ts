import { Connection } from "@solana/web3.js";
import { getOrca, OrcaPoolConfig, OrcaU64, Quote, Percentage, OrcaToken, getTokenCount } from '@orca-so/sdk';
import Decimal from 'decimal.js';
import { u64 } from "@solana/spl-token";
import { OrcaPoolParams, FeeStructure } from "@orca-so/sdk/dist/model/orca/pool/pool-types";
import { QuotePoolParams, QuoteBuilderFactory } from "@orca-so/sdk/dist/model/quote/quote-builder";
import { orcaPoolConfigs } from "@orca-so/sdk/dist/constants";

const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net/";

const commitment = 'confirmed';
const connection = new Connection(RPC_ENDPOINT_URL, commitment);

// get_quote (without connection, this calculation depends on args only)
function get_quote_with_pool_amounts(
  pool_params: OrcaPoolParams,
  token_a_amount: u64,
  token_b_amount: u64,
  input_token: OrcaToken,
  input_amount: u64,
  slippage: Decimal,
  zero_fee: boolean,
): Quote {  
  const LAMPORTS_PER_SIGNATURE = 5000;
  const ZERO_FEE: FeeStructure = { traderFee: Percentage.fromFraction(0, 10000), ownerFee: Percentage.fromFraction(0, 10000) };

  const token_a = pool_params.tokens[pool_params.tokenIds[0]];
  const token_b = pool_params.tokens[pool_params.tokenIds[1]];
  const forward = token_a.tag === input_token.tag;

  const input_pool_token   = forward ? token_a : token_b;
  const output_pool_token  = forward ? token_b : token_a;
  const input_pool_amount  = forward ? token_a_amount : token_b_amount;
  const output_pool_amount = forward ? token_b_amount : token_a_amount;

  // reference: https://github.com/orca-so/typescript-sdk/blob/main/src/model/orca/pool/orca-pool.ts (getQuoteWithPoolAmounts)
  const quote_params: QuotePoolParams = {
    inputToken: input_pool_token,
    outputToken: output_pool_token,
    inputTokenCount: input_pool_amount,
    outputTokenCount: output_pool_amount,
    feeStructure: zero_fee ? ZERO_FEE : pool_params.feeStructure,
    slippageTolerance: Percentage.fromDecimal(slippage),
    lamportsPerSignature: LAMPORTS_PER_SIGNATURE,
    amp: pool_params.amp !== undefined ? new u64(pool_params.amp) : undefined,
  };

  const quoteBuilder = QuoteBuilderFactory.getBuilder(pool_params.curveType);
  const quote = quoteBuilder?.buildQuote(quote_params, input_amount);
  if (quote == undefined) {
    throw new Error("Failed to get quote!");
  }
  return quote;
}

async function main() {
  const orca = getOrca(connection);

  const pool = orca.getPool(OrcaPoolConfig.SOL_USDC);
  const sol_token = pool.getTokenA();
  const usdc_token = pool.getTokenB();

  // Input
  const input_amount = OrcaU64.fromNumber(1, sol_token.scale); /* 1 SOL */
  const acceptable_slippage = new Decimal("0.1" /* % */);

  // SIMPLE WAY (but, strictly speaking, swap_rate itself depends fee rate)
  {
    const quote = await pool.getQuote(sol_token, input_amount, acceptable_slippage);
    const min_output_amount = quote.getMinOutputAmount();
    const expected_output_amount = quote.getExpectedOutputAmount();
    const fee_in_sol = quote.getLPFees();
    // fee in sol * swap_rate(usdc/sol)
    const fee_in_usdc = fee_in_sol.toDecimal().mul(quote.getRate());

    console.log(`simple expected: ${expected_output_amount.toDecimal()} USDC`);
    console.log(`simple minimum: ${min_output_amount.toDecimal()} USDC`);
    console.log(`simple fee: ${fee_in_sol.toDecimal()} SOL / ${fee_in_usdc} USDC`);
  }

  // ANOTHER WAY
  {
    const pool_params = orcaPoolConfigs[OrcaPoolConfig.SOL_USDC];
    const token_count = await getTokenCount(connection, pool_params, sol_token, usdc_token);
    const quote_with_fee = get_quote_with_pool_amounts(pool_params, token_count.inputTokenCount, token_count.outputTokenCount, sol_token, input_amount.toU64(), acceptable_slippage, false);
    const quote_zero_fee = get_quote_with_pool_amounts(pool_params, token_count.inputTokenCount, token_count.outputTokenCount, sol_token, input_amount.toU64(), acceptable_slippage, true);

    const min_output_amount_with_fee = quote_with_fee.getMinOutputAmount();
    const expected_output_amount_with_fee = quote_with_fee.getExpectedOutputAmount();
    const expected_output_amount_zero_fee = quote_zero_fee.getExpectedOutputAmount();
    // output of zero_fee - output of with_fee
    const fee_in_usdc = expected_output_amount_zero_fee.toDecimal().sub(expected_output_amount_with_fee.toDecimal());

    console.log(`another expected: ${expected_output_amount_with_fee.toDecimal()} USDC`);
    console.log(`another minimum: ${min_output_amount_with_fee.toDecimal()} USDC`);
    console.log(`another fee: ${fee_in_usdc} USDC`);
  }
}

main();

/*

$ ts-node src/get_quote_with_fee.ts 
simple expected: 35.177575 USDC
simple minimum: 35.142397 USDC
simple fee: 0.003 SOL / 0.105532725 USDC
another expected: 35.177575 USDC
another minimum: 35.142397 USDC
another fee: 0.10585 USDC

*/
