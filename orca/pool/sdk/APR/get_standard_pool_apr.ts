import { Connection, PublicKey } from "@solana/web3.js";
import { ORCA_FARM_ID } from '@orca-so/sdk';
import { MintLayout, u64 } from "@solana/spl-token";
import { fetchGlobalFarms, GlobalFarm } from "@orca-so/aquafarm";
import fetch from 'node-fetch'; // npm install node-fetch@2 (v2)
import Decimal from 'decimal.js';

const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net/";
const ORCA_STANDARD_POOL_CONFIG_ENDPOINT_URL = "https://api.orca.so/configs";
const ORCA_STANDARD_POOL_STATS_ENDPOINT_URL = "https://api.orca.so/allPools";
const COINGECKO_API_V3_BASE_URL = "https://api.coingecko.com/api/v3";

const APR_BASE_DURATION = "week"; // "day"(24h) | "week"(7D) | "month"(30D)

async function get_accounts(connection: Connection, pubkeys: PublicKey[]) {
  const batch_size = 100;
  const result = [];
  for (let offset = 0; offset < pubkeys.length; offset += batch_size) {
    const slice = pubkeys.slice(offset, Math.min(offset+batch_size, pubkeys.length));
    const account_infos = await connection.getMultipleAccountsInfo(slice);
    account_infos.forEach((ai) => result.push(ai));
  }
  return result;
}

function calculate_farm_apr(farm: GlobalFarm, token_decimal: number, token_price: number, tvl: Decimal): number {
  if ( farm === undefined || token_decimal === undefined || token_price === undefined || tvl.isZero() ) return 0;

  const farm_week_emission = new Decimal(farm.emissionsPerSecondNumerator.toString())
  .mul(60 * 60 * 24 * 7)
  .div(farm.emissionsPerSecondDenominator.toString())
  .div(new Decimal(10).pow(token_decimal));

  const annual_reward = farm_week_emission.mul(52.1429).mul(token_price);
  const farm_apr = annual_reward.div(tvl).mul(100);
  return farm_apr.toNumber();
}

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL, 'confirmed');
  
  // get ORCA Standard Pool Configs
  console.log("get configs...");
  const raw_configs = await (await fetch(ORCA_STANDARD_POOL_CONFIG_ENDPOINT_URL)).json();

  // token definition
  // build map (mint to token, symbol to token)
  console.log("build token map...");
  const tokens = {};
  Object.keys(raw_configs.tokens).map((t) => {
    const token = raw_configs.tokens[t];
    const definition = {
      symbol: t,
      ...token,
      coingeckoId: raw_configs.coingeckoIds[t],
    }

    tokens[token.mint] = definition; // by mint
    tokens[t] = definition; // by symbol
  });

  // pool, aquafarm, doubleDip definition
  console.log("get pools, aquafarms, doubledips...");
  const pools = raw_configs.pools;
  const aquafarms = raw_configs.aquafarms;
  const doubledips = raw_configs.doubleDips;

  // pool stats
  console.log("get pool stats...");
  const raw_pool_stats = await (await fetch(ORCA_STANDARD_POOL_STATS_ENDPOINT_URL)).json();
  const pool_stats = {};
  Object.keys(raw_pool_stats).forEach((p) => pool_stats[raw_pool_stats[p].poolAccount] = raw_pool_stats[p]);

  // get usd price of tokens from coingecko
  console.log("get token usd price from coingecko...");
  const ids = Object.keys(raw_configs.coingeckoIds).map((t) => raw_configs.coingeckoIds[t]).join(",");
  const coingecko = await (await fetch(`${COINGECKO_API_V3_BASE_URL}/simple/price?ids=${ids}&vs_currencies=usd`)).json();
  const token_usd_prices = {};
  Object.keys(coingecko).forEach((t) => token_usd_prices[t] = coingecko[t].usd);

  // get aquafarm/doubleDip stats
  console.log("get farm stats...");
  const farm_pubkeys = [];
  Object.keys(aquafarms).forEach((p) => farm_pubkeys.push(new PublicKey(aquafarms[p].account)));
  Object.keys(doubledips).forEach((p) => farm_pubkeys.push(new PublicKey(doubledips[p].account)));
  const global_farms = await fetchGlobalFarms(connection, farm_pubkeys, ORCA_FARM_ID);
  const farm_stats = {};
  farm_pubkeys.forEach((p, i) => farm_stats[p.toBase58()] = global_farms[i]);

  // farm mint stats
  console.log("get farm mint stats...");
  const farm_mint_pubkeys = [];
  Object.keys(aquafarms).forEach((p) => farm_mint_pubkeys.push(new PublicKey(aquafarms[p].farmTokenMint)));
  Object.keys(doubledips).forEach((p) => farm_mint_pubkeys.push(new PublicKey(doubledips[p].farmTokenMint)));
  const mint_account_infos = await get_accounts(connection, farm_mint_pubkeys);
  const farm_mint_stats = {}
  farm_mint_pubkeys.forEach((p, i) => {
    const raw_mint = MintLayout.decode(mint_account_infos[i].data);
    farm_mint_stats[p.toBase58()] = { ...raw_mint, supply: u64.fromBuffer(raw_mint.supply) };
  });

  for ( const id of Object.keys(pools) ) {
    // pool
    const pool = pools[id];
    const stats = pool_stats[pool.account];
    const token_a = tokens[pool.tokenAName];
    const token_b = tokens[pool.tokenBName];
    const token_a_amount = new Decimal(stats.tokenAAmount).div(10**token_a.decimals);
    const token_b_amount = new Decimal(stats.tokenBAmount).div(10**token_b.decimals);
    const token_a_price = token_usd_prices[token_a.coingeckoId];
    const token_b_price = token_usd_prices[token_b.coingeckoId];
    const lp_token_supply = parseInt(stats.poolTokenSupply);

    // aquafarm
    const aquafarm = aquafarms[pool.account];
    const aquafarm_stats = farm_stats[aquafarm?.account];
    const aquafarm_mint_stats = farm_mint_stats[aquafarm?.farmTokenMint];
    const aquafarm_token_supply = aquafarm_mint_stats?.supply;
    const token_aq = tokens[aquafarm?.rewardTokenMint];
    const token_aq_price = token_usd_prices[token_aq?.coingeckoId];

    // doubledip
    const doubledip = doubledips[pool.account];
    const doubledip_stats = farm_stats[doubledip?.account];
    const doubledip_mint_stats = farm_mint_stats[doubledip?.farmTokenMint];
    const doubledip_token_supply = doubledip_mint_stats?.supply;
    const token_dd = tokens[doubledip?.rewardTokenMint];
    const token_dd_price = token_usd_prices[token_dd?.coingeckoId];

    // DoubleDip stake rate
    // APR of DoubleDip is calculated using doubledip_stake_rate, 
    // since the portion for those who have not set it is distributed to those who have set it.
    const doubledip_stake_rate = (doubledip_token_supply === undefined || lp_token_supply === 0)
      ? 0
      : new Decimal(doubledip_token_supply.toString()).div(lp_token_supply).toNumber();

    // TVL
    let tvl = new Decimal(0);
    if ( token_a_price && token_b_price ) {
      const token_a_value = token_a_amount.mul(token_a_price);
      const token_b_value = token_b_amount.mul(token_b_price);
      tvl = token_a_value.add(token_b_value);
    }

    // APR
    const trading_apr = stats.apy[APR_BASE_DURATION]*100;
    const aquafarm_apr = calculate_farm_apr(aquafarm_stats, token_aq?.decimals, token_aq_price, tvl);
    const doubledip_apr = calculate_farm_apr(doubledip_stats, token_dd?.decimals, token_dd_price, tvl.mul(doubledip_stake_rate));
    const total_apr = trading_apr + aquafarm_apr + doubledip_apr;

    if ( aquafarm_apr == 0 && doubledip_apr == 0 )
      console.log(id, total_apr);
    else
      console.log(id, total_apr, "(", "Trade", trading_apr, "AQ", aquafarm_apr, "DD", doubledip_apr, ")");
  }
}

main();

/*
SAMPLE OUTPUT

$ ts-node app/src/get_standard_pool_apr.ts 
get configs...
build token map...
get pools, aquafarms, doubledips...
get pool stats...
get token usd price from coingecko...
get farm stats...
get farm mint stats...
SAMO/SOL 3.424128214469771
SOL/USDC 6.951697483405364
USDC/USDT 0.1692039268104603
ETH/USDC 2.3086938445320953
BTC/ETH 0.659959142113721
ETH/SOL 1.0434380980711013
RAY/SOL 4.582345279981573
SOL/USDT 4.793930749726046
SOL/SRM 1.2347763459852497
FTT/SOL 0.711283491463905
KIN/SOL 2.0931910860367946
ROPE/SOL 1.4809365341255387
SOL/STEP 1.9700684296235411
OXY/SOL NaN
MER/SOL 2.0160813472362737
FIDA/SOL 6.920729079920633
MAPS/SOL 0.8360744112980479
COPE/SOL 2.386544058239035
USDC/USDT[stable] 1.0017712498861302
SOL/USDC[aquafarm] 8.071401841327921
SOL/USDT[aquafarm] 6.891502691810001
ETH/SOL[aquafarm] 3.086647888839559
ETH/USDC[aquafarm] 9.89010924885318
RAY/SOL[aquafarm] 20.68395647537158
ROPE/SOL[aquafarm] 1.7133859833352667
STEP/SOL[aquafarm] 6.27397693755962
SRM/SOL[aquafarm] 5.842851783371561
FTT/SOL[aquafarm] 2.069238565752373
COPE/SOL[aquafarm] 3.467237878844248
OXY/SOL[aquafarm] 13.461674373050919
BTC/SOL[aquafarm] 2.4467848033327226
MER/SOL[aquafarm] 3.818467815846924
FIDA/SOL[aquafarm] 20.259340362571624
MAPS/SOL[aquafarm] 2.7088734103165093
USDC/USDT[stable][aquafarm] 0.9374626954309265
ORCA/SOL[aquafarm] 3.514115509659335
ORCA/USDC[aquafarm] 1.3456066455662385
KIN/SOL[aquafarm] 6.427469906983128
SAMO/SOL[aquafarm] 7.173795737784104
LIQ/USDC[aquafarm] 3.85976758436741
SNY/USDC[aquafarm] 1.189106400870308
mSOL/USDC[aquafarm] 6.370090662537393
SLRS/USDC[aquafarm] 1.0557221185241985
PORT/USDC[aquafarm] 6.298257581495406
SBR/USDC[aquafarm] 3.8387325555275806
scnSOL/USDC[aquafarm] 4.0683784180054845
pSOL/USDC[aquafarm] 3.186537394882538
mSOL/SOL[stable][aquafarm] 1.1028388292920905
ORCA/PAI[aquafarm] 0.43003774530536787
ORCA/mSOL[aquafarm] 2.6374858225142046
scnSOL/SOL[stable][aquafarm] 0.17911978652719104
ATLAS/USDC[aquafarm] 4.527618789207347
POLIS/USDC[aquafarm] 3.7115528332187355
BOP/USDC[aquafarm] 3.815133792122399
SAMO/USDC[aquafarm] 7.497818123167368
NINJA/SOL[aquafarm] 74.58967449677425 ( Trade 2.2614306863905047 AQ 18.503014726231765 DD 53.82522908415198 )
SLIM/USDC[aquafarm] 4.299307221108425
wHAPI/USDC[aquafarm] 0.7591859183047891
COPE/USDC[aquafarm] 1.2100186704583977
SUNNY/USDC[aquafarm] 12.650038288362866
GRAPE/USDC[aquafarm] 0.18210163265188392
ABR/USDC[aquafarm] 3.3450941497413136
KURO/USDC[aquafarm] 0.013280607272512913
MEDIA/USDC[aquafarm] 5.898515994728312
TULIP/USDC[aquafarm] 0.1631339506294518
MNGO/USDC[aquafarm] 5.010564042052336
stSOL/wstETH[aquafarm] 18.918171994551532 ( Trade 0.889746416460359 AQ 1.2207304360599307 DD 16.807695142031243 )
SYP/USDC[aquafarm] 0.5273703390430419
stSOL/wLDO[aquafarm] 14.690661074472045
whETH/SOL[aquafarm] 2.638529691411931
whETH/USDC[aquafarm] 10.405859447262058
MNDE/mSOL[aquafarm] 58.72327734508938 ( Trade 7.828557962810355 AQ 3.4728873639793294 DD 47.421832018299696 )
WAG/USDC[aquafarm] 3.77026772299432
mSOL/USDT[aquafarm] 5.682619194826404
mSOL/whETH[aquafarm] 2.309011618943425
BTC/mSOL[aquafarm] 1.38033865422352
IVN/SOL[aquafarm] 0.2909140171860828
LARIX/USDC[aquafarm] 0.6428226474042544
PRT/USDC[aquafarm] 37.97669887961322
JET/USDC[aquafarm] 0.7078927974603629
stSOL/USDC[aquafarm] 18.433273495404215 ( Trade 6.392885298655639 AQ 0.14833299355260565 DD 11.892055203195973 )
wstETH/USDC[aquafarm] 0.8794378427381091
AURY/USDC[aquafarm] 0.5733142415521283
AVAX/USDC[aquafarm] 6.079394625279282
FTT/USDC[aquafarm] 3.343770201057904
RAY/USDC[aquafarm] 18.055817788189877
SLND/USDC[aquafarm] 1.267776897714438
GOFX/USDC[aquafarm] 13.762239701156599
WOOF/USDC[aquafarm] 9.755551093334903
SDOGE/USDC[aquafarm] 4.5175331943599915
CATO/USDC[aquafarm] 2.0278791470211632
OOGI/USDC[aquafarm] 2.229063702311943
SONAR/USDC[aquafarm] 0.24395060858486642
APT/USDC[aquafarm] 0.3136999868549951
DFL/USDC[aquafarm] 4.243459784571687
DFL/SOL[aquafarm] 5.700215288604663
FRKT/USDC[aquafarm] 37.998128344275386
TTT/USDC[aquafarm] 0.08703730785384735
UPS/USDC[aquafarm] 0.32478653193861523
FANT/USDC[aquafarm] 1.082802806018419
BLOCK/USDC[aquafarm] 0.5292970660751632
RUN/USDC[aquafarm] 0.17414267796894184
UXP/USDC[aquafarm] 0.0624691729301248
BTC/USDC[aquafarm] 4.460217818846494
MNDE/USDC[aquafarm] 7.965489404670261
CHICKS/USDC[aquafarm] 51.35063178254071 ( Trade 3.863692449962967 AQ 13.521281662628194 DD 33.96565766994955 )
1SOL/USDC[aquafarm] 6.549965786257964
WMP/USDC[aquafarm] 0.34488719634137
UNQ/USDC[aquafarm] 0.3791334826980807
BASIS/USDC[aquafarm] 23.285255549044575
GST/USDC[aquafarm] 11.576761620015334
MEAN/USDC[aquafarm] 2.4357371614264474
AART/USDC[aquafarm] 0.13843693389430334
SHDW/USDC[aquafarm] 2.3886455809014646
SHDW/SOL[aquafarm] 3.9011032184344896
SCY/USDC[aquafarm] 1.3940613908120776
SLC/USDC[aquafarm] 1.1243349554881572
wUST/SOL[aquafarm] 44.77078891939756
wUST/USDC[stable][aquafarm] 5.623057377894694
mSOL/wUST[aquafarm] 16.788250325119108
wLUNA/wUST[aquafarm] 61.51523798422118
stSOL/wUST[aquafarm] 31.663128990995283
JSOL/USDC[aquafarm] 4.864342655847534
daoSOL/USDC[aquafarm] 4.157246567622724
ORCA/USDT[aquafarm] 0.5368520806932563
ORCA/whETH[aquafarm] 2.956028848932959
GENE/USDC[aquafarm] 14.111048527367995
CMFI/USDC[aquafarm] 0.32620710971271827
CELO/USDC[aquafarm] 40.61069749595811
FTM/USDC[aquafarm] 27.611406712042175
BTC/ORCA[aquafarm] 1.3115933838989953
HBB/USDC[aquafarm] 5.130765414026184
HBB/SOL[aquafarm] 8.38760008351003
SB/USDC[aquafarm] 0.003678745858918583
stSOL/USDT[aquafarm] 17.027507537129804 ( Trade 5.475796456002753 AQ 0.14284460358365397 DD 11.408866477543397 )
SEEDED/USDC[aquafarm] 0.2757604302347037
AUDIO/USDC[aquafarm] 1.7789498333736715
MMA/USDC[aquafarm] 4.367389058237758
1SOL/SOL[aquafarm] 7.042062622143268
PUFF/SOL[aquafarm] 9.37084339901807
SAO/USDC[aquafarm] 4.671647957147279
sRLYv2/SOL[aquafarm] 0.36389721712929896
ZBC/USDC[aquafarm] 3.403897549805171
GMT/USDC[aquafarm] 8.635236347860467
NOVA/USDC[aquafarm] 3.9081321773628876
HBB/USDH[aquafarm] 2.2227420902630866
TAKI/sRLYv2[aquafarm] NaN
ZIG/USDC[aquafarm] 0.23138708575131667
sRLY/SOL[aquafarm] 94.20609433952922 ( Trade 2.1704752242044174 AQ 0 DD 92.03561911532479 )
TAKI/sRLY[aquafarm] 1.2092686397702337 ( Trade 0.23143876780525335 AQ 0 DD 0.9778298719649804 )
stSOL/SOL[stable][aquafarm] 11.177823310941374 ( Trade 0.5382123972833921 AQ 0.15661012339000435 DD 10.483000790267978 )
BTC/stSOL[aquafarm] 22.08731219655379 ( Trade 1.8361662116756206 AQ 0.7275522190202438 DD 19.523593765857925 )
stSOL/whETH[aquafarm] 18.882065423005894 ( Trade 2.196677378576074 AQ 0.40495694735162824 DD 16.280431097078193 )

*/