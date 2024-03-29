import { WhirlpoolContext, AccountFetcher, buildWhirlpoolClient, PriceMath, PDAUtil, ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG, Whirlpool, WhirlpoolRewardInfoData, PoolUtil } from "@orca-so/whirlpools-sdk";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { MintInfo } from "@solana/spl-token";
import { Wallet, BN } from "@project-serum/anchor";
import { DecimalUtil } from "@orca-so/common-sdk";
import Decimal from "decimal.js";
import fetch from 'node-fetch'; // npm install node-fetch@2 (v2)

const RPC_ENDPOINT_URL = "https://api.mainnet-beta.solana.com";
const ORCA_ENDPOINT_WHIRLPOOL = "https://api.mainnet.orca.so/v1/whirlpool/list";
const ORCA_ENDPOINT_TOKEN = "https://api.mainnet.orca.so/v1/token/list";

const MSOL = {mint: new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"), decimals: 9};
const USDC = {mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), decimals: 6};

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL);
  const ctx = WhirlpoolContext.from(connection, new Wallet(Keypair.generate()), ORCA_WHIRLPOOL_PROGRAM_ID);
  const fetcher = new AccountFetcher(ctx.connection);
  const client = buildWhirlpoolClient(ctx);

  const token_a = MSOL;
  const token_b = USDC;
  const tick_spacing = 64;
  const user_range_lower = new Decimal("36.5660");
  const user_range_upper = new Decimal("48.1493");

  const user_range_lower_tickindex = PriceMath.priceToInitializableTickIndex(user_range_lower, token_a.decimals, token_b.decimals, tick_spacing);
  const user_range_upper_tickindex = PriceMath.priceToInitializableTickIndex(user_range_upper, token_a.decimals, token_b.decimals, tick_spacing);

  const pool_address = PDAUtil.getWhirlpool(ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG, token_a.mint, token_b.mint, tick_spacing).publicKey;
  const pool = await client.getPool(pool_address);

  // get offchain data
  const offchain_data = await (await fetch(ORCA_ENDPOINT_WHIRLPOOL)).json();
  const pool_offchain_data = offchain_data.whirlpools.filter((pool_data) => pool_data.address == pool_address.toBase58()).shift();

  // calc fee based on trade volume
  const fee_rate = pool.getData().feeRate / 1000000;
  // maybe protocol_fee should be considered
  //const protocol_fee_rate = pool.getData().protocolFeeRate / 10000;
  //const lp_fee_rate = fee_rate * (1 - protocol_fee_rate);
  const lp_fee_rate = fee_rate;

  const volume24h_in_usd = pool_offchain_data.volume.day;
  const fee24h_in_usd = new Decimal(volume24h_in_usd).mul(lp_fee_rate).toNumber();

  // get token USD price from coingecko
  const token_list = await (await fetch(ORCA_ENDPOINT_TOKEN)).json();
  const token_map = new Map();
  token_list.tokens.forEach((token) => token_map.set(token.mint, token));

  const mints: string[] = [];
  mints.push(pool.getTokenAInfo().mint.toBase58());
  mints.push(pool.getTokenBInfo().mint.toBase58());
  if ( PoolUtil.isRewardInitialized(pool.getData().rewardInfos[0]) ) mints.push(pool.getData().rewardInfos[0].mint.toBase58());
  if ( PoolUtil.isRewardInitialized(pool.getData().rewardInfos[1]) ) mints.push(pool.getData().rewardInfos[1].mint.toBase58());
  if ( PoolUtil.isRewardInitialized(pool.getData().rewardInfos[2]) ) mints.push(pool.getData().rewardInfos[2].mint.toBase58());

  const coingecko_ids = mints.map((mint) => token_map.get(mint).coingeckoId).filter((v) => v !== null).join(",");
  const coingecko_price = await (await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coingecko_ids}&vs_currencies=usd`)).json();
  const token_prices: TokenUSDPrices = {};
  mints.map((mint) => {
    const id = token_map.get(mint).coingeckoId;
    const price = coingecko_price[id];
    if ( id !== null && price !== undefined ) token_prices[mint] = new Decimal(price.usd);
  });

  // estimate
  const mint_infos = await Promise.all(pool.getData().rewardInfos.map((reward) => {
    return PoolUtil.isRewardInitialized(reward) ? fetcher.getMintInfo(reward.mint) : null
  }));
  const apr = estimateAprsForPriceRange(
    pool,
    token_prices,
    fee24h_in_usd,
    user_range_lower_tickindex,
    user_range_upper_tickindex,
    mint_infos
  );

  console.log("lower", PriceMath.tickIndexToPrice(user_range_lower_tickindex, token_a.decimals, token_b.decimals).toString());
  console.log("upper", PriceMath.tickIndexToPrice(user_range_upper_tickindex, token_a.decimals, token_b.decimals).toString());
  console.log("APR", 100 * (apr.fee + apr.rewards[0] + apr.rewards[1] + apr.rewards[2]), "%");
  console.log("APR detail", apr);
}

// Simple Porting from whirlpool-sdk
// https://github.com/orca-so/whirlpool-sdk/blob/main/src/utils/public/apr.ts
//////////////////////////////////////////////
export type TokenUSDPrices = Record<string, Decimal>;

export type EstimatedAprs = {
  fee: number;
  rewards: number[];
};

export const ZERO_APR = {
  fee: 0,
  rewards: [0, 0, 0],
};

export function estimateAprsForPriceRange(
  pool: Whirlpool,
  tokenPrices: TokenUSDPrices,
  fees24h: number,
  tickLowerIndex: number,
  tickUpperIndex: number,
  mintInfos: (null | MintInfo)[],
): EstimatedAprs {
  const {
    liquidity,
    sqrtPrice,
    tokenMintA,
    tokenMintB,
  } = pool.getData();

  const tokenDecimalsA = pool.getTokenAInfo().decimals;
  const tokenDecimalsB = pool.getTokenBInfo().decimals;
  const tokenPriceA = tokenPrices[tokenMintA.toBase58()];
  const tokenPriceB = tokenPrices[tokenMintB.toBase58()];

  if (!fees24h || !tokenPriceA || !tokenPriceB || tickLowerIndex >= tickUpperIndex) {
    return ZERO_APR;
  }

  // Value of liquidity if the entire liquidity were concentrated between tickLower/Upper
  // Since this is virtual liquidity, concentratedValue should actually be less than totalValue
  const amounts = PoolUtil.getTokenAmountsFromLiquidity(liquidity, sqrtPrice, PriceMath.tickIndexToSqrtPriceX64(tickLowerIndex), PriceMath.tickIndexToSqrtPriceX64(tickUpperIndex), true);
  const tokenValueA = getTokenValue(amounts.tokenA, tokenDecimalsA, tokenPriceA);
  const tokenValueB = getTokenValue(amounts.tokenB, tokenDecimalsB, tokenPriceB);
  const concentratedValue = tokenValueA.add(tokenValueB);

  const feesPerYear = new Decimal(fees24h).mul(365);
  const feeApr = feesPerYear.div(concentratedValue).toNumber();

  const rewards = pool.getData().rewardInfos.map((reward, i) =>
    estimateRewardApr(reward, concentratedValue, tokenPrices, mintInfos[i])
  );

  return { fee: feeApr, rewards };
}

const SECONDS_PER_YEAR =
  60 * // SECONDS
  60 * // MINUTES
  24 * // HOURS
  365; // DAYS
function estimateRewardApr(
  reward: WhirlpoolRewardInfoData,
  concentratedValue: Decimal,
  tokenPrices: TokenUSDPrices,
  mintInfo: (null | MintInfo),
) {
  const { mint, emissionsPerSecondX64 } = reward;
  const rewardTokenPrice = tokenPrices[mint.toBase58()];

  const emissionsPerSecond = new Decimal(emissionsPerSecondX64.toString()).div(Decimal.pow(2, 64));

  if (!emissionsPerSecond || !rewardTokenPrice) {
    return 0;
  }

  return emissionsPerSecond
    .mul(SECONDS_PER_YEAR)
    .div(Decimal.pow(10, mintInfo.decimals))
    .mul(rewardTokenPrice)
    .div(concentratedValue)
    .toNumber();
}

function getTokenValue(tokenAmount: BN, tokenDecimals: number, tokenPrice: Decimal) {
  return DecimalUtil.adjustDecimals(new Decimal(tokenAmount.toString()), tokenDecimals).mul(
    tokenPrice
  );
}
//////////////////////////////////////////////


main();