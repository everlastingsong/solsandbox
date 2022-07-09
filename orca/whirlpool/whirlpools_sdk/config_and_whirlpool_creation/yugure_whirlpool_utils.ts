import { PublicKey, Keypair } from "@solana/web3.js";
import {
    WhirlpoolContext, AccountFetcher,
    PDAUtil, WhirlpoolData, PoolUtil, WhirlpoolIx, PriceMath, toTx,
    ParsableFeeTier, TickUtil,
    ORCA_WHIRLPOOLS_CONFIG,
    Whirlpool, IncreaseLiquidityInput, increaseLiquidityQuoteByInputToken
} from "@orca-so/whirlpools-sdk";
import { u64 } from "@solana/spl-token";
import { BN } from "@project-serum/anchor";
import { DecimalUtil, Percentage, TransactionBuilder } from "@orca-so/common-sdk";
import assert from "assert";
import Decimal from "decimal.js";

////////////////////////////////////////////////////////////////////////////////
// interface
////////////////////////////////////////////////////////////////////////////////
export interface TokenDefinition {
  symbol: string,
  mint: PublicKey,
  decimals: number,
}

export interface Feetier {
  tick_spacing: number,
  default_fee_rate: number,
}

export interface IncreaseLiquidityQuote {
  lower_tick_index: number,
  upper_tick_index: number,
  quote: IncreaseLiquidityInput
}

////////////////////////////////////////////////////////////////////////////////
// create function
////////////////////////////////////////////////////////////////////////////////
export async function create_config_and_feetiers(
  ctx: WhirlpoolContext,
  authority: PublicKey,
  default_protocol_fee_rate: number,
  feetiers: Feetier[]
): Promise<PublicKey> {
  const tx = new TransactionBuilder(ctx.provider);

  // create WhirlpoolsConfig
  const config_keypair = Keypair.generate();
  tx.addInstruction(WhirlpoolIx.initializeConfigIx(ctx.program, {
    funder: ctx.wallet.publicKey,
    whirlpoolsConfigKeypair: config_keypair,
    feeAuthority: authority,
    collectProtocolFeesAuthority: authority,
    rewardEmissionsSuperAuthority: authority,
    // typical = 300, 300 / 10000 = 0.03 = 3%
    defaultProtocolFeeRate: default_protocol_fee_rate,
  }));

  feetiers.map((feetier) => {
    const pda = PDAUtil.getFeeTier(ctx.program.programId, config_keypair.publicKey, feetier.tick_spacing);
    tx.addInstruction(WhirlpoolIx.initializeFeeTierIx(ctx.program, {
    funder: ctx.wallet.publicKey,
    feeTierPda: pda,
    whirlpoolsConfig: config_keypair.publicKey,
    tickSpacing: feetier.tick_spacing,
    feeAuthority: authority,
    // typical for stable pair = 100, 100 / 1000000 = 0.0001 = 0.01%
    // typical for Non stable pair = 2000, 2000 / 1000000 = 0.002 = 0.2%
    defaultFeeRate: feetier.default_fee_rate,
    }));
  });

  const signature = await tx.buildAndExecute();
  console.log("create_config_and_feetiers signature", signature);
  await ctx.connection.confirmTransaction(signature, "confirmed");

  return config_keypair.publicKey;
}

export async function create_whirlpool(
  ctx: WhirlpoolContext,
  config: PublicKey,
  token_a: TokenDefinition,
  token_b: TokenDefinition,
  tick_spacing: number,
  init_price: Decimal,
): Promise<PublicKey> {
  // cardinally ordered check
  assert(PoolUtil.orderMints(token_a.mint, token_b.mint)[0].toString() === token_a.mint.toString(),
         "token_a and token_b is NOT ordered cardinally");

  // should not create whirlpool with ORCA_WHIRLPOOLS_CONFIG
  assert(config.toBase58() !== ORCA_WHIRLPOOLS_CONFIG.toBase58(),
         "config should not be ORCA_WHIRLPOOLS_CONFIG");

  // get sqrt_price
  const init_sqrt_price = PriceMath.priceToSqrtPriceX64(init_price, token_a.decimals, token_b.decimals);

  // gen keys
  const whirlpool_pda = PDAUtil.getWhirlpool(
    ctx.program.programId,
    config,
    token_a.mint, token_b.mint, tick_spacing);
  const feetier_pda = PDAUtil.getFeeTier(ctx.program.programId, config, tick_spacing);
  const token_a_vault_keypair = Keypair.generate();
  const token_b_vault_keypair = Keypair.generate();

  // build tx
  const ix = WhirlpoolIx.initializePoolIx(ctx.program, {
      initSqrtPrice: init_sqrt_price,
      tickSpacing: tick_spacing,
      tokenMintA: token_a.mint,
      tokenMintB: token_b.mint,
      tokenVaultAKeypair: token_a_vault_keypair,
      tokenVaultBKeypair: token_b_vault_keypair,
      whirlpoolPda: whirlpool_pda,
      whirlpoolsConfig: config,
      feeTierKey: feetier_pda.publicKey,
      funder: ctx.wallet.publicKey,
  });

  // execute tx
  const signature = await toTx(ctx, ix).buildAndExecute();
  console.log("create_whirlpool signature", signature);
  await ctx.connection.confirmTransaction(signature, "confirmed");

  return whirlpool_pda.publicKey;
}

export async function create_tickarrays(
  ctx: WhirlpoolContext,
  whirlpool: PublicKey,
  token_a: TokenDefinition,
  token_b: TokenDefinition,
  tick_spacing: number,
  init_price_range_lower: Decimal,
  init_price_range_upper: Decimal,
): Promise<PublicKey[]> {
  // generate ix to initialize tickarrays
  const lower_index = PriceMath.priceToTickIndex(init_price_range_lower, token_a.decimals, token_b.decimals);
  const upper_index = PriceMath.priceToTickIndex(init_price_range_upper, token_a.decimals, token_b.decimals);
  const tickarrays = [];
  let offset = 0;
  while ( true ) {
      let start_index = TickUtil.getStartTickIndex(lower_index, tick_spacing, offset);
      let pda = PDAUtil.getTickArrayFromTickIndex(lower_index, tick_spacing, whirlpool, ctx.program.programId, offset);
      let ix = WhirlpoolIx.initTickArrayIx(ctx.program, {
          funder: ctx.wallet.publicKey,
          startTick: start_index,
          tickArrayPda: pda,
          whirlpool: whirlpool,
      });
      if ( start_index > upper_index ) break;
      tickarrays.push({start_index, pda, ix});
      offset++;
  }

  // execute transaction
  const MAX_IX_NUM = 10;
  for ( let i=0; i<tickarrays.length; i += MAX_IX_NUM ) {
    const ix_chunk = tickarrays.slice(i, i+MAX_IX_NUM).map((t) => t.ix);

    const tx = new TransactionBuilder(ctx.provider);
    ix_chunk.map((ix) => tx.addInstruction(ix));

    const signature = await tx.buildAndExecute();
    console.log("create_tickarrays signature", signature);
    await ctx.connection.confirmTransaction(signature, "confirmed");
  }

  return tickarrays.map((tickarray) => tickarray.pda.publicKey);
}

export async function create_whirlpool_and_tickarrays(
  ctx: WhirlpoolContext,
  config: PublicKey,
  token_a: TokenDefinition,
  token_b: TokenDefinition,
  tick_spacing: number,
  init_price: Decimal,
  init_price_range_lower: Decimal,
  init_price_range_upper: Decimal,
): Promise<PublicKey[]> {
  console.log("create_whirlpool_and_tickarrays");
  console.log("  whirlpool program", ctx.program.programId.toBase58());
  console.log("  config", config.toBase58());
  console.log("  token_a", `symbol ${token_a.symbol} mint ${token_a.mint.toBase58()} decimals ${token_a.decimals}`);
  console.log("  token_b", `symbol ${token_b.symbol} mint ${token_b.mint.toBase58()} decimals ${token_b.decimals}`);
  console.log("  tick_spacing", tick_spacing);
  console.log("  init_price", init_price.toString());
  console.log("  init_price_range", init_price_range_lower.toString(), "-", init_price_range_upper.toString());

  const whirlpool_pubkey = await create_whirlpool(ctx, config, token_a, token_b, tick_spacing, init_price);
  const tickarray_pubkeys = await create_tickarrays(ctx, whirlpool_pubkey, token_a, token_b, tick_spacing, init_price_range_lower, init_price_range_upper);
  await print_whirlpool(ctx, whirlpool_pubkey, token_a, token_b);
  await print_tickarrays(ctx, tickarray_pubkeys, token_a, token_b);
  return [whirlpool_pubkey, ...tickarray_pubkeys];
}

////////////////////////////////////////////////////////////////////////////////
// deposit function
////////////////////////////////////////////////////////////////////////////////
export function get_increase_liquidity_quote(
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

export async function open_position(
  ctx: WhirlpoolContext,
  whirlpool: Whirlpool,
  quote: IncreaseLiquidityQuote,
  with_metadata: boolean,
) {
  // get tx
  let position_mint_tx;
  if ( with_metadata ) {
    position_mint_tx = await whirlpool.openPositionWithMetadata(
      quote.lower_tick_index,
      quote.upper_tick_index,
      quote.quote
    );
  } else {
    position_mint_tx = await whirlpool.openPosition(
      quote.lower_tick_index,
      quote.upper_tick_index,
      quote.quote
    );
  }

  // execute transaction
  const signature = await position_mint_tx.tx.buildAndExecute();
  console.log("open_position signature", signature);
  console.log("position NFT", position_mint_tx.positionMint.toBase58());
  await ctx.connection.confirmTransaction(signature);  
}

////////////////////////////////////////////////////////////////////////////////
// reward function
////////////////////////////////////////////////////////////////////////////////
export async function initialize_reward(
  ctx: WhirlpoolContext,
  whirlpool: PublicKey,
  reward_index: number,
  reward_authority: PublicKey,
  reward_mint: PublicKey
) {
  const reward_vault_keypair = Keypair.generate();
  const ix = WhirlpoolIx.initializeRewardIx(ctx.program, {
    whirlpool: whirlpool,
    rewardIndex: reward_index,
    rewardAuthority: reward_authority,
    rewardMint: reward_mint,
    rewardVaultKeypair: reward_vault_keypair,
    funder: ctx.wallet.publicKey,
  });

  console.log("initialize_reward");
  console.log("  whirlpool", whirlpool.toBase58());
  console.log("  reward_index", reward_index);
  console.log("  reward_authority", reward_authority.toBase58());
  console.log("  reward_mint", reward_mint.toBase58());
  console.log("  reward_vault (generated)", reward_vault_keypair.publicKey.toBase58());

  // execute transaction
  const signature = await toTx(ctx, ix).buildAndExecute();
  console.log("signature", signature);
  await ctx.connection.confirmTransaction(signature, "confirmed");

  return reward_vault_keypair.publicKey;
}

export async function set_weekly_reward_emission(
  ctx: WhirlpoolContext,
  whirlpool: PublicKey,
  whirlpool_data: WhirlpoolData,
  reward_index: number,
  emission_per_week: u64,
) {
  const emission_per_second = DecimalUtil.fromU64(emission_per_week).div(60*60*24*7).floor();
  const emission_per_second_x64 = new BN(emission_per_second.toString()).shln(64);

  console.log("set_weekly_reward_emission");
  console.log("  emission_per_week", emission_per_week.toString());
  console.log("  emission_per_second", emission_per_second.toString());
  console.log("  emission_per_second * SEC/WEEK", emission_per_second.mul(60*60*24*7).toString());
  console.log("  emission_per_second_x64", emission_per_second_x64.toString());

  await set_reward_emission(ctx, whirlpool, whirlpool_data, reward_index, emission_per_second_x64);
}

export async function set_reward_emission(
  ctx: WhirlpoolContext,
  whirlpool: PublicKey,
  whirlpool_data: WhirlpoolData,
  reward_index: number,
  emission_per_second_x64: BN,
) {
  const reward_authority = whirlpool_data.rewardInfos[reward_index].authority;
  const reward_vault = whirlpool_data.rewardInfos[reward_index].vault;
  const reward_mint = whirlpool_data.rewardInfos[reward_index].mint;

  console.log("set_reward_emission");
  console.log("  whirlpool", whirlpool.toBase58());
  console.log("  reward_index", reward_index);
  console.log("  reward_authority", reward_authority.toBase58());
  console.log("  reward_mint", reward_mint.toBase58());
  console.log("  reward_vault", reward_vault.toBase58());
  console.log("  emission_per_second_x64", emission_per_second_x64.toString());

  const ix = WhirlpoolIx.setRewardEmissionsIx(ctx.program, {
    whirlpool: whirlpool,
    rewardIndex: reward_index,
    rewardAuthority: reward_authority,
    rewardVaultKey: reward_vault,
    emissionsPerSecondX64: emission_per_second_x64,
  });

  // execute transaction
  const signature = await toTx(ctx, ix).buildAndExecute();
  console.log("signature", signature);
  await ctx.connection.confirmTransaction(signature, "confirmed");
}

////////////////////////////////////////////////////////////////////////////////
// print function
////////////////////////////////////////////////////////////////////////////////
export async function print_config_and_feetiers(ctx: WhirlpoolContext, config: PublicKey) {
  const fetcher = new AccountFetcher(ctx.connection);
  const config_data = await fetcher.getConfig(config, true);

  const tick_spacing_list = [1, 2, 4, 8, 16, 32, 64, 128, 256];
  const feetier_pubkeys = tick_spacing_list.map((tick_spacing) => PDAUtil.getFeeTier(ctx.program.programId, config, tick_spacing).publicKey);

  const account_infos = await ctx.connection.getMultipleAccountsInfo(feetier_pubkeys);
  const feetier_datas = account_infos.map((account_info) => ParsableFeeTier.parse(account_info?.data));

  console.log("config pubkey", config.toBase58());
  console.log("config collectProtocolFeesAuthority", config_data.collectProtocolFeesAuthority.toBase58());
  console.log("config feeAuthority", config_data.feeAuthority.toBase58());
  console.log("config rewardEmissionsSuperAuthority", config_data.rewardEmissionsSuperAuthority.toBase58());
  console.log("config defaultProtocolFeeRate", config_data.defaultProtocolFeeRate, `(${new Decimal(config_data.defaultProtocolFeeRate).div(10000).mul(100)} %)`);

  feetier_datas.map((feetier_data, i) => {
    if ( feetier_data === null ) {
      console.log("feetier", "tick_spacing", tick_spacing_list[i], "NOT INITIALIZED");
    } else {
      console.log("feetier", "tick_spacing", tick_spacing_list[i], "pubkey", feetier_pubkeys[i].toBase58(),
                  "default_fee_rate", feetier_data.defaultFeeRate,
                  `(${new Decimal(feetier_data.defaultFeeRate).div(1000000).mul(100)} %)`);
    }
  });
}

export async function print_whirlpool(ctx: WhirlpoolContext, whirlpool: PublicKey, token_a: TokenDefinition, token_b: TokenDefinition) {
  const fetcher = new AccountFetcher(ctx.connection);
  const whirlpool_data = (await fetcher.getPool(whirlpool, true)) as WhirlpoolData;

  console.log("whirlpool pubkey", whirlpool.toBase58());
  console.log("feeGrowthGlobalA", whirlpool_data.feeGrowthGlobalA.toString());
  console.log("feeGrowthGlobalB", whirlpool_data.feeGrowthGlobalB.toString());
  console.log("feeRate", whirlpool_data.feeRate, "=", new Decimal(whirlpool_data.feeRate).div(1000000).mul(100).toFixed(3), "%");
  console.log("liquidity", whirlpool_data.liquidity.toString());
  console.log("protocolFeeOwedA", whirlpool_data.protocolFeeOwedA.toString());
  console.log("protocolFeeOwedB", whirlpool_data.protocolFeeOwedB.toString());
  console.log("protocolFeeRate", whirlpool_data.protocolFeeRate, "=", new Decimal(whirlpool_data.protocolFeeRate).div(10000).mul(100).toFixed(3), "%");
  console.log("protocolFeeRate x feeRate", new Decimal(whirlpool_data.protocolFeeRate).div(10000).mul(whirlpool_data.feeRate).div(1000000).mul(100).toFixed(3), "%");
  console.log("rewardInfos");
  whirlpool_data.rewardInfos.map((rewardInfo) => {
      console.log("  reward.mint", rewardInfo.mint.toBase58());
      console.log("    vault", rewardInfo.vault.toBase58());
      console.log("    authority", rewardInfo.authority.toBase58());
      console.log("    emissionsPerSecondX64", rewardInfo.emissionsPerSecondX64.toString());
      console.log("    growthGlobalX64", rewardInfo.growthGlobalX64.toString());
  });
  console.log("rewardLastUpdatedTimestamp", whirlpool_data.rewardLastUpdatedTimestamp.toString());
  console.log("sqrtPrice", whirlpool_data.sqrtPrice.toString());
  console.log("price", PriceMath.sqrtPriceX64ToPrice(whirlpool_data.sqrtPrice, token_a.decimals, token_b.decimals).toString());
  console.log("tickCurrentIndex", whirlpool_data.tickCurrentIndex);
  console.log("tickSpacing", whirlpool_data.tickSpacing);
  console.log("tokenMintA", whirlpool_data.tokenMintA.toBase58());
  console.log("tokenMintB", whirlpool_data.tokenMintB.toBase58());
  console.log("tokenVaultA", whirlpool_data.tokenVaultA.toBase58());
  console.log("tokenVaultB", whirlpool_data.tokenVaultB.toBase58());
  console.log("whirlpoolBump", whirlpool_data.whirlpoolBump);
  console.log("whirlpoolsConfig", whirlpool_data.whirlpoolsConfig.toBase58());
}

export async function print_tickarrays(ctx: WhirlpoolContext, tickarrays: PublicKey[], token_a: TokenDefinition, token_b: TokenDefinition) {
  const fetcher = new AccountFetcher(ctx.connection);
  const tickarray_data_list = await fetcher.listTickArrays(tickarrays, true);

  tickarray_data_list.map((tickarray_data, i) => {
    if ( tickarray_data === null ) {
      console.log("tickarray",
                  "pubkey", tickarrays[i].toBase58(),
                  "NULL"
                  );
    } else {
      console.log("tickarray",
                  "pubkey", tickarrays[i].toBase58(),
                  "start_index", tickarray_data.startTickIndex,
                  "price", PriceMath.tickIndexToPrice(tickarray_data.startTickIndex, token_a.decimals, token_b.decimals)
                  );
    }
  });
}