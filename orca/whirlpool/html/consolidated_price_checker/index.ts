// build: webpack

import fetch from 'node-fetch'; // npm install node-fetch@2 (v2)
import { PublicKey } from "@solana/web3.js";
import { OrcaWhirlpoolClient, OrcaNetwork } from "@orca-so/whirlpool-sdk";
import Decimal from "decimal.js";
import $ from "jquery";

const COINGECKO_API_V3_BASE_URL = "https://api.coingecko.com/api/v3";
const SOLSCAN_BASE_URL = "https://solscan.io";
const ORCA_ENDPOINT_TOKENS_URL = "https://api.mainnet.orca.so/v1/token/list?whitelisted=true";

type ConsolidatedPriceType = "whirlpool" | "coingecko" | "none";

function get_short_address(address: string, prefix_suffix_length: number = 4): string {
  return address.substring(0, prefix_suffix_length) + "..." + address.substring(address.length-prefix_suffix_length);
}

function prices_table_clear() {
  $("#prices").find("tr").remove();
}

function prices_table_append(
  symbol: string,
  name: string,
  mint: string,
  coingecko_id: string,
  whirlpool_price: Decimal,
  coingecko_price: Decimal,
  consolidated_price_type: ConsolidatedPriceType,
  consolidated_price: Decimal,
  diff_rate: number
) {
  const difference = diff_rate === undefined
    ? ""
    : new Decimal(diff_rate).mul(100).toFixed(2) + " %";

  const diff_percentage_abs = Math.abs(diff_rate*100);
  let health = "ok";
  if ( diff_percentage_abs >  5 ) health = "alert-level1";
  if ( diff_percentage_abs > 20 ) health = "alert-level2";
  if ( diff_percentage_abs > 50 ) health = "alert-level3";

  let consolidated_price_type_icon = "";
  if ( consolidated_price_type == "whirlpool" ) consolidated_price_type_icon = "🌀";
  if ( consolidated_price_type == "coingecko" ) consolidated_price_type_icon = "🐸";

  const html = `
  <tr class="${health}">
    <td class="left-align">${symbol}</td>
    <td class="left-align">${name}</td>
    <td class="left-align">
      <a href="${SOLSCAN_BASE_URL}/account/${mint}" target="_blank">
      ${get_short_address(mint)}
      </a>
    </td>
    <td class="left-align">${coingecko_id ?? ""}</td>
    <td>${whirlpool_price?.toFixed(6) ?? ""}</td>
    <td>${coingecko_price?.toFixed(6) ?? ""}</td>
    <td>
      ${consolidated_price_type_icon}
      ${consolidated_price?.toFixed(6) ?? ""}
    </td>
    <td>${difference}</td>  
  </tr>`;
  $("#prices").append(html);
}

function consolidate_price(whirlpool_price: Decimal, coingecko_price: Decimal): ConsolidatedPriceType {
  if ( whirlpool_price === undefined && coingecko_price === undefined ) return "none";

  if ( coingecko_price === undefined ) return "whirlpool";
  if ( whirlpool_price === undefined ) return "coingecko";

  return "whirlpool";
}

async function main() {
  const orca = new OrcaWhirlpoolClient({ network: OrcaNetwork.MAINNET });

  const offchain_pools = await orca.offchain.getPools();
  const offchain_tokens = await (await fetch(ORCA_ENDPOINT_TOKENS_URL)).json(); // to get decimals, use raw endpoint

  const whirlpool_pubkeys = Object.keys(offchain_pools).map((pk) => new PublicKey(pk));

  // order by token symbol (case-insensitive)
  const tokens = offchain_tokens.tokens
                 .sort((a, b) => a.symbol.toLowerCase().localeCompare(b.symbol.toLowerCase()))

  // get coingecko prices
  console.log("get coingecko prices...");
  const coingecko_ids = tokens.map((v) => v.coingeckoId).filter((id) => id !== null).join(",");
  const coingecko_prices = await (await fetch(`${COINGECKO_API_V3_BASE_URL}/simple/price?ids=${coingecko_ids}&vs_currencies=usd`)).json();

  // get whirlpool prices
  console.log("get whirlpool prices...");

  // to avoid fetching mint info one by one, cache all mint info in advance
  const whirlpool_mint_pubkeys = Array.from(Object.values(offchain_pools).reduce(
    (set, pool) => set.add(pool.tokenMintA).add(pool.tokenMintB),
    new Set<string>()
  ));
  await orca.data.listMintInfos(whirlpool_mint_pubkeys, false);

  const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const whirlpool_prices = await orca.getTokenPrices(whirlpool_pubkeys, USDC);

  prices_table_clear();
  tokens.forEach((token) => {
    let coingecko_price = undefined;
    let whirlpool_price = undefined;
    if ( coingecko_prices[token.coingeckoId] ) coingecko_price = new Decimal(coingecko_prices[token.coingeckoId].usd);
    if ( whirlpool_prices[token.mint] ) whirlpool_price = whirlpool_prices[token.mint];

    const consolidated_price_type = consolidate_price(whirlpool_price, coingecko_price);
    let consolidated_price = undefined;
    if ( consolidated_price_type == "whirlpool" ) consolidated_price = whirlpool_price;
    if ( consolidated_price_type == "coingecko" ) consolidated_price = coingecko_price;

    let diff_rate = undefined;
    if ( coingecko_price && whirlpool_price ) diff_rate = whirlpool_price / coingecko_price - 1;

    //console.log(token.symbol, token.name, token.mint, token.decimals, token.coingeckoId, whirlpool_price, coingecko_price, diff_rate);
    prices_table_append(
      token.symbol,
      token.name,
      token.mint,
      token.coingeckoId,
      whirlpool_price,
      coingecko_price,
      consolidated_price_type,
      consolidated_price,
      diff_rate
    );
  });

}

main();