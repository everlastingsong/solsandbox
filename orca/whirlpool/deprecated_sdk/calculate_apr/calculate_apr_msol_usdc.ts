import { PriceMath } from "@orca-so/whirlpools-sdk";
import { PublicKey } from "@solana/web3.js";
import Decimal from "decimal.js";
import fetch from 'node-fetch'; // npm install node-fetch@2 (v2)

// IMPORT FROM DEPRECATED SDK
import { estimateAprsForPriceRange, OrcaNetwork, OrcaWhirlpoolClient, TokenUSDPrices } from "@orca-so/whirlpool-sdk";
import { getTokenUSDPrices } from "@orca-so/whirlpool-sdk/dist/utils/token-price";

const MSOL = {mint: new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"), decimals: 9};
const USDC = {mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), decimals: 6};

async function main() {
  const oldsdk = new OrcaWhirlpoolClient({ network: OrcaNetwork.MAINNET });

  const token_a = MSOL;
  const token_b = USDC;
  const tick_spacing = 64;
  const user_range_lower = new Decimal("36.5660");
  const user_range_upper = new Decimal("48.1493");

  const user_range_lower_tickindex = PriceMath.priceToInitializableTickIndex(user_range_lower, token_a.decimals, token_b.decimals, tick_spacing);
  const user_range_upper_tickindex = PriceMath.priceToInitializableTickIndex(user_range_upper, token_a.decimals, token_b.decimals, tick_spacing);

  const pool_address = oldsdk.pool.derivePDA(token_a.mint, token_b.mint, tick_spacing).publicKey;
  const pool_data = await oldsdk.getPool(pool_address);

  // get offchain data
  // https://mainnet-zp2-v2.orca.so/pools
  const offchain_data = await oldsdk.offchain.getPools();
  const pool_offchain_data = offchain_data[pool_address.toBase58()];

  // calc fee based on trade volume
  // maybe protocol_fee should be considered
  //const lp_fee_rate = pool_data.feePercentage.mul(new Decimal(1).sub(pool_data.protocolFeePercentage));
  const lp_fee_rate = pool_data.feePercentage;
  const volume24h_in_usd = pool_offchain_data.volume?.day;
  const fee24h_in_usd = new Decimal(volume24h_in_usd).mul(lp_fee_rate).toNumber();

  /*
  // get token USD price from whirlpool itself (slow)
  const whirlpool_list = Object.keys(offchain_data).map((b58) => new PublicKey(b58));
  const pool_datas = await oldsdk.data.listPools(whirlpool_list, false);
  const token_prices = await getTokenUSDPrices(oldsdk.data, pool_datas, USDC.mint);
  */

  // get token USD price from coingecko (woof should be woof-token...)
  const token_list = await oldsdk.offchain.getTokens();
  const coingecko_ids = Object.keys(token_list).map((mint) => token_list[mint].coingeckoId).filter((v) => v !== null).join(",");
  const coingecko_price = await (await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coingecko_ids}&vs_currencies=usd`)).json();
  const token_prices: TokenUSDPrices = {};
  Object.keys(token_list).map((mint) => {
    const id = token_list[mint].coingeckoId;
    const price = coingecko_price[id];
    if ( id !== null && price !== undefined ) token_prices[mint] = new Decimal(price.usd);
  });

  const apr = estimateAprsForPriceRange(
    pool_data,
    token_prices,
    fee24h_in_usd,
    user_range_lower_tickindex,
    user_range_upper_tickindex
  );

  console.log(PriceMath.tickIndexToPrice(user_range_lower_tickindex, token_a.decimals, token_b.decimals).toString());
  console.log(PriceMath.tickIndexToPrice(user_range_upper_tickindex, token_a.decimals, token_b.decimals).toString());
  console.log(apr);
  console.log("APR", 100 * (apr.fee + apr.rewards[0] + apr.rewards[1] + apr.rewards[2]), "%");
}

main();