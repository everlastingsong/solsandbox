import { OrcaPoolConfig, Quote, Percentage } from '@orca-so/sdk';
import { OrcaPoolParams } from "@orca-so/sdk/dist/model/orca/pool/pool-types";
import { QuotePoolParams, QuoteBuilderFactory } from "@orca-so/sdk/dist/model/quote/quote-builder";
import { orcaPoolConfigs } from '@orca-so/sdk/dist/constants';
import Decimal from 'decimal.js';
import fetch from 'node-fetch'; // npm install node-fetch@2 (v2)
import { u64 } from "@solana/spl-token";

// NO OPERATION: avoid import error of Percentage class
orcaPoolConfigs[OrcaPoolConfig.SOL_USDC];

// Network fee
const LAMPORTS_PER_SIGNATURE = 5000;

const VERBOSE_OUTPUT = false;

// Store of allPools and orcaPoolConfigs
class Pool {
  public readonly token_a_name: string
  public readonly token_b_name: string
  public readonly token_a_amount: u64
  public readonly token_b_amount: u64
  public readonly pool_params: OrcaPoolParams

  constructor(pool_params: OrcaPoolParams, token_a_amount: string, token_b_amount: string) {
    this.token_a_name = pool_params.tokens[pool_params.tokenIds[0]].tag;
    this.token_b_name = pool_params.tokens[pool_params.tokenIds[1]].tag;
    this.token_a_amount = new u64(token_a_amount);
    this.token_b_amount = new u64(token_b_amount);
    this.pool_params = pool_params;
  }

  get_quote(input_token_name: string, input_amount: u64, slippage: Decimal): Quote {
    const token_a = this.pool_params.tokens[this.pool_params.tokenIds[0]];
    const token_b = this.pool_params.tokens[this.pool_params.tokenIds[1]];
    const forward = token_a.tag === input_token_name;

    const input_pool_token   = forward ? token_a : token_b;
    const output_pool_token  = forward ? token_b : token_a;
    const input_pool_amount  = forward ? this.token_a_amount : this.token_b_amount;
    const output_pool_amount = forward ? this.token_b_amount : this.token_a_amount;

    // reference: https://github.com/orca-so/typescript-sdk/blob/main/src/model/orca/pool/orca-pool.ts (getQuoteWithPoolAmounts)
    const quote_params: QuotePoolParams = {
      inputToken: input_pool_token,
      outputToken: output_pool_token,
      inputTokenCount: input_pool_amount,
      outputTokenCount: output_pool_amount,
      feeStructure: this.pool_params.feeStructure,
      slippageTolerance: Percentage.fromDecimal(slippage),
      lamportsPerSignature: LAMPORTS_PER_SIGNATURE,
      amp: this.pool_params.amp !== undefined ? new u64(this.pool_params.amp) : undefined,
    };

    const quoteBuilder = QuoteBuilderFactory.getBuilder(this.pool_params.curveType);
    const quote = quoteBuilder?.buildQuote(quote_params, input_amount);
    if (quote == undefined) {
      throw new Error("Failed to get quote!");
    }
    return quote;
  }
}

// Store of Route Calculation
class RouteStep {
  public readonly previous_step: RouteStep;
  public readonly amount: Map<string, RouteStepTokenAmount>;

  private constructor(previous_step: RouteStep, tokens: Set<string>) {
    this.previous_step = previous_step;
    this.amount = new Map<string, RouteStepTokenAmount>();
    tokens.forEach((token_name) => this.amount.set(token_name, new RouteStepTokenAmount()));
  }

  public static create_first_step(tokens: Set<string>, input_token_name: string, input_amount: u64): RouteStep {
    const step = new RouteStep(null, tokens);
    step.update_token_amount_if_better(input_token_name, input_amount, null, true);
    return step;
  }  

  public create_next_step(pools: Pool[], slippage: Decimal): RouteStep {
    const tokens = new Set<string>([...this.amount.keys()]);
    const step = new RouteStep(this, tokens);

    pools.forEach((pool) => {
      // apply Swap a to b (forward direction)
      if ( ! this.amount.get(pool.token_a_name).amount.isZero() ) {
        const input_amount = this.amount.get(pool.token_a_name).amount;
        const expected_amount = pool.get_quote(pool.token_a_name, input_amount, slippage);
        step.update_token_amount_if_better(pool.token_b_name, expected_amount.getMinOutputAmount().toU64(), pool, true);
      }
  
      // apply Swap b to a (reverse direction)
      if ( ! this.amount.get(pool.token_b_name).amount.isZero() ) {
        const input_amount = this.amount.get(pool.token_b_name).amount;
        const expected_amount = pool.get_quote(pool.token_b_name, input_amount, slippage);
        step.update_token_amount_if_better(pool.token_a_name, expected_amount.getMinOutputAmount().toU64(), pool, false);
      }
    });
    
    return step;
  }

  // get route string: xxx USDC >>> SOL/USDC >>> xxx SOL >>> SOL/SHDW >>> xxx SHDW
  public get_route(output_token_name: string): string {
    const token = this.amount.get(output_token_name);
    const amount = `${get_ui_amount_string(output_token_name, token.amount)} ${output_token_name}`;

    if ( token.amount.isZero() ) {
      return "*** NO ROUTE ***";
    }

    if ( token.route_pool === null ) {
      return amount;
    }

    const route = `>>> ${token.route_pool.token_a_name}/${token.route_pool.token_b_name} >>>`;
    const route_from_token_name = token.route_direction_forward ? token.route_pool.token_a_name : token.route_pool.token_b_name;
    const sub_route = this.previous_step.get_route(route_from_token_name);
    return `${sub_route} ${route} ${amount}`;    
  }

  private update_token_amount_if_better(token_name: string, amount: u64, route_pool: Pool, route_direction_forward: boolean): void {
    if ( VERBOSE_OUTPUT ) {
      console.log("...update_token_amount_if_better", 
                  "from", route_pool === null ? "INPUT" : (route_direction_forward ? route_pool.token_a_name : route_pool.token_b_name),
                  "to", token_name,
                  "amount", amount.toString());
    }
    this.amount.get(token_name).update_token_amount_if_better(amount, route_pool, route_direction_forward);
  }
}

class RouteStepTokenAmount {
  public amount: u64
  public route_pool: Pool
  public route_direction_forward: boolean

  constructor() {
    this.amount = new u64(0);
    this.route_pool = null;
    this.route_direction_forward = true;
  }

  update_token_amount_if_better(amount: u64, route_pool: Pool, route_direction_forward: boolean): void {
    if ( amount.gt(this.amount) ) {
      this.amount = amount;
      this.route_pool = route_pool;
      this.route_direction_forward = route_direction_forward;
    }
  }
}

// get OrcaPoolParams from orcaPoolConfigs by address of pool
function get_pool_params(pool_address: string): OrcaPoolParams {
  const keys = Object.keys(orcaPoolConfigs);
  for ( let i = 0; i < keys.length; i++ ) {
    const params = orcaPoolConfigs[keys[i]];
    if ( params.address.toBase58() === pool_address ) {
      return params;
    }
  }
  return undefined;
}

// 1_000_000_000 to 1 SOL
function get_ui_amount_string(token_name: string, amount: u64) {
  const keys = Object.keys(orcaPoolConfigs);
  for ( let i = 0; i < keys.length; i++ ) {
    const params = orcaPoolConfigs[keys[i]];
    const token_a = params.tokens[params.tokenIds[0]];
    const token_b = params.tokens[params.tokenIds[1]];
    if ( token_a.tag === token_name ) {
      return new Decimal(amount.toString()).div(new Decimal(10).pow(token_a.scale)).toFixed(3).toString();
    }
    if ( token_b.tag === token_name ) {
      return new Decimal(amount.toString()).div(new Decimal(10).pow(token_b.scale)).toFixed(3).toString();
    }
  }
}

async function main() {
  // read allPools and orcaPoolConfigs
  const orca_all_pools = await (await fetch("https://api.orca.so/allPools")).json();
  const pools: Pool[] = [];
  for ( const pool_name in orca_all_pools) {
    const pool = orca_all_pools[pool_name];

    // ignore if SDK doesn't support
    const pool_params = get_pool_params(pool.poolAccount);
    if ( pool_params !== undefined ) {
      pools.push(new Pool(pool_params, pool.tokenAAmount, pool.tokenBAmount));
    }
  }

  // get all token name
  const tokens = new Set<string>();
  pools.map((pool) => tokens.add(pool.token_a_name).add(pool.token_b_name));

  // input, output and slippage
  const input_token_name = "SOL";
  const input_amount = new u64(1_000_000_000); // 1 SOL
  const output_token_name = "GST";
  const acceptable_slippage = new Decimal("0.1" /* % */);
  
  // route calculation (Breadth-First-Search)
  console.log("STEP 0");
  const step_0 = RouteStep.create_first_step(tokens, input_token_name, input_amount);
  console.log(step_0.get_route(output_token_name));

  console.log("STEP 1");
  const step_1 = step_0.create_next_step(pools, acceptable_slippage);
  console.log(step_1.get_route(output_token_name));

  console.log("STEP 2");
  const step_2 = step_1.create_next_step(pools, acceptable_slippage);
  console.log(step_2.get_route(output_token_name));
}

main();

/*
OUTPUT SAMPLE:

$ ts-node src/get_best_route.ts

STEP 0
*** NO ROUTE ***
STEP 1
*** NO ROUTE ***
STEP 2
1.000 SOL >>> SOL/USDC >>> 89.421 USDC >>> GST/USDC >>> 14.428 GST

REFERENCE (Uniswap):
https://github.com/Uniswap/v2-sdk/blob/main/src/entities/trade.ts#L228

*/
