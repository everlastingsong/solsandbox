import fetch from 'node-fetch'; // npm install node-fetch@2 (v2)
import { PublicKey } from "@solana/web3.js";
import { WhirlpoolContext, WhirlpoolData, PriceMath } from "@orca-so/whirlpools-sdk";
import { Address, translateAddress } from "@project-serum/anchor";
import Decimal from "decimal.js";
import FastPriorityQueue from "fastpriorityqueue";

const ORCA_ENDPOINT_WHIRLPOOLS_URL = "https://api.mainnet.orca.so/v1/whirlpool/list?whitelisted=true"

type Base58Address = string;

interface TokenPrice {
  mint: Base58Address;
  usdPrice: Decimal;
  pathVolume: number;
}

interface TokenState {
  reachability: boolean;
  usdPrice: Decimal;
  pathVolume: number;
}

interface WhirlpoolOffchainPartialData {
  volume: { day: number, week: number, month: number };
}

interface WhirlpoolCombinedData {
  mintA: Base58Address;
  mintB: Base58Address;
  decimalsA: number,
  decimalsB: number,
  onchainData: Pick<WhirlpoolData, "sqrtPrice">;
  offchainData: WhirlpoolOffchainPartialData;
}

type TokenGraph = Record<Base58Address, Record<Base58Address, WhirlpoolCombinedData>>;

export type TokenUSDPrices = Record<Base58Address, TokenPrice>;

class PrioritizedTokenPriceQueue {
  private tokens: string[];
  private tokenToIndex: Record<Base58Address, number>;
  private states: TokenState[];
  private pqueue: FastPriorityQueue<number>;

  constructor(whirlpools: WhirlpoolCombinedData[]) {
    const token_set = new Set<string>();
    Object.values(whirlpools).forEach((pool) => token_set.add(pool.mintA).add(pool.mintB));
    this.tokens = Array.from(token_set);

    this.tokenToIndex = {};
    this.tokens.forEach((token, i) => this.tokenToIndex[token] = i);

    this.states = [];
    this.tokens.forEach((token) => this.states.push({
      reachability: false,
      usdPrice: new Decimal(0),
      pathVolume: -1,
    }));

    this.pqueue = new FastPriorityQueue<number>((ia: number, ib: number): boolean => {
      const stateA = this.states[ia];
      const stateB = this.states[ib];
      if ( stateA.reachability && !stateB.reachability ) return true;
      if ( !stateA.reachability && stateB.reachability ) return false;
      if ( stateA.pathVolume > stateB.pathVolume ) return true;
      if ( stateA.pathVolume < stateB.pathVolume ) return false;
      return ia < ib;
    });
    this.tokens.forEach((token, i) => this.pqueue.add(i));
  }

  public update(token: Base58Address, pathVolume: number, usdPrice: Decimal) {
    const index = this.tokenToIndex[token];
    const state = this.states[index];

    if ( state.reachability && state.pathVolume >= pathVolume ) return;

    state.reachability = true;
    state.pathVolume = pathVolume
    state.usdPrice = usdPrice;

    this.pqueue.remove(index);
    this.pqueue.add(index);
  }

  public next(): TokenPrice {
    if ( this.pqueue.isEmpty() ) return undefined;

    const index = this.pqueue.peek();
    const token = this.tokens[index];
    const state = this.states[index];

    if ( !state.reachability ) return undefined;
    this.pqueue.poll();

    return {
      mint: token,
      usdPrice: state.usdPrice,
      pathVolume: state.pathVolume
    };
  }
}

export async function getTokenUSDPrices(
  ctx: WhirlpoolContext,
  baseTokenMint: Address,
  baseTokenUSDPrice = new Decimal(1)
): Promise<TokenUSDPrices> {
  // Get offchain data
  const whirlpool_offchain_datas = await (await fetch(ORCA_ENDPOINT_WHIRLPOOLS_URL)).json(); 

  // Get onchain data
  const whirlpool_pubkeys: PublicKey[] = whirlpool_offchain_datas.whirlpools.map((pool) => new PublicKey(pool.address));
  const whirlpool_onchain_datas = await ctx.fetcher.listPools(whirlpool_pubkeys, true);

  // Combine onchain data and offchain data
  const whirlpools: WhirlpoolCombinedData[] = whirlpool_pubkeys.map((pubkey, i) => {
    const offchain = whirlpool_offchain_datas.whirlpools[i];
    return {
      mintA: offchain.tokenA.mint,
      mintB: offchain.tokenB.mint,
      decimalsA: offchain.tokenA.decimals,
      decimalsB: offchain.tokenB.decimals,
      onchainData: whirlpool_onchain_datas[i],
      offchainData: {
        volume: {
          day: offchain.volume.day,
          week: offchain.volume.week,
          month: offchain.volume.month
        }
      }
    };
  });

  // Create a bi-directional graph, where tokens are vertices and pools are edges
  const tokenGraph: TokenGraph = {};
  whirlpools.forEach((pool) => {
    tokenGraph[pool.mintA] = { [pool.mintB]: pool, ...tokenGraph[pool.mintA] };
    tokenGraph[pool.mintB] = { [pool.mintA]: pool, ...tokenGraph[pool.mintB] };
  });

  // Start with tokens paired with `baseTokenMint`
  const base = translateAddress(baseTokenMint).toBase58();
  const pqueue = new PrioritizedTokenPriceQueue(whirlpools);
  pqueue.update(base, Number.POSITIVE_INFINITY, baseTokenUSDPrice);

  // Traverse the graph, prioritize edges of pools with high trade volume
  const result: TokenUSDPrices = {};
  while ( true ) {
    const tokenPrice = pqueue.next();
    if ( tokenPrice === undefined ) break;

    console.log("pop", tokenPrice.mint, tokenPrice.pathVolume, tokenPrice.usdPrice.toString());
    result[tokenPrice.mint] = tokenPrice;

    for (const [neighbor, pool] of Object.entries(tokenGraph[tokenPrice.mint] || {})) {
      const poolPrice = PriceMath.sqrtPriceX64ToPrice(pool.onchainData.sqrtPrice, pool.decimalsA, pool.decimalsB);
      const poolVolume = pool.offchainData.volume.day;

      const neighborPrice = pool.mintA === neighbor
        ? tokenPrice.usdPrice.mul(poolPrice)
        : tokenPrice.usdPrice.div(poolPrice);

      const nextPathVolume = Math.min(tokenPrice.pathVolume, poolVolume);

      pqueue.update(neighbor, nextPathVolume, neighborPrice);
      console.log("  update", neighbor, nextPathVolume, neighborPrice.toString());
    }
  }

  return result;
}
