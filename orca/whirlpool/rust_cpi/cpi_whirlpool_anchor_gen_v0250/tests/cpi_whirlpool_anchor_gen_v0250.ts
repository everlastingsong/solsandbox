import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { CpiWhirlpoolAnchorGenV0250 } from "../target/types/cpi_whirlpool_anchor_gen_v0250";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG,
  PDAUtil, PriceMath, TickUtil, AccountFetcher, SwapUtils,
  swapQuoteByInputToken, WhirlpoolContext, buildWhirlpoolClient,
  increaseLiquidityQuoteByInputToken, decreaseLiquidityQuoteByLiquidity,
  collectFeesQuote, collectRewardsQuote, TickArrayUtil, PoolUtil,
} from "@orca-so/whirlpools-sdk";
import { TOKEN_PROGRAM_ID, AccountLayout, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TransactionBuilder, resolveOrCreateATA, deriveATA, DecimalUtil, Percentage } from "@orca-so/common-sdk";
import { assert, expect } from "chai";

const SOL = {mint: new PublicKey("So11111111111111111111111111111111111111112"), decimals: 9};
const ORCA = {mint: new PublicKey("orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE"), decimals: 6};
const SAMO = {mint: new PublicKey("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"), decimals: 9};
const USDC = {mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), decimals: 6};

describe("cpi_whirlpool_anchor_gen_v0250", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const connection = anchor.getProvider().connection;
  const program = anchor.workspace.CpiWhirlpoolAnchorGenV0250 as Program<CpiWhirlpoolAnchorGenV0250>;
  const provider = anchor.getProvider();
  const wallet = anchor.AnchorProvider.env().wallet;
  const fetcher = new AccountFetcher(connection);
  const whirlpool_ctx = WhirlpoolContext.from(connection, wallet, ORCA_WHIRLPOOL_PROGRAM_ID, fetcher);
  const whirlpool_client = buildWhirlpoolClient(whirlpool_ctx);

  const sol_usdc_whirlpool_pubkey = PDAUtil.getWhirlpool(ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG, SOL.mint, USDC.mint, 64).publicKey;
  const samo_usdc_whirlpool_pubkey = PDAUtil.getWhirlpool(ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG, SAMO.mint, USDC.mint, 64).publicKey;

  const position_mint_keypair = Keypair.generate();
  const position_mint = position_mint_keypair.publicKey;
  const position_pda = PDAUtil.getPosition(ORCA_WHIRLPOOL_PROGRAM_ID, position_mint);

  const verify_log = (logs: string[], message: string) => { expect(logs).includes(`Program log: verify! ${message}`); };
  const rent_ta = async () => { return connection.getMinimumBalanceForRentExemption(AccountLayout.span) }
  const sleep = (second) => new Promise(resolve => setTimeout(resolve, second * 1000));

  it("load whirlpools config account", async () => {
    const config = await fetcher.getConfig(ORCA_WHIRLPOOLS_CONFIG);

    const signature = await program.methods.verifyWhirlpoolsConfigAccount().accounts({whirlpoolsConfig: ORCA_WHIRLPOOLS_CONFIG}).rpc();
    await connection.confirmTransaction(signature, "confirmed");

    const transaction = await connection.getParsedTransaction(signature, "confirmed");
    const logs = transaction.meta.logMessages;

    // verification
    verify_log(logs, `fee_authority: ${config.feeAuthority.toBase58()}`);
    verify_log(logs, `collect_protocol_fees_authority: ${config.collectProtocolFeesAuthority.toBase58()}`);
    verify_log(logs, `reward_emissions_super_authority: ${config.rewardEmissionsSuperAuthority.toBase58()}`);
    verify_log(logs, `default_protocol_fee_rate: ${config.defaultProtocolFeeRate}`);
  });

  it("load fee tier 1 account", async () => {
    const feetier_pubkey = PDAUtil.getFeeTier(ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG, 1).publicKey;
    const feetier = await fetcher.getFeeTier(feetier_pubkey);

    const signature = await program.methods.verifyFeetierAccount().accounts({feetier: feetier_pubkey}).rpc();
    await connection.confirmTransaction(signature, "confirmed");

    const transaction = await connection.getParsedTransaction(signature, "confirmed");
    const logs = transaction.meta.logMessages;

    // verification
    verify_log(logs, `whirlpools_config: ${feetier.whirlpoolsConfig.toBase58()}`);
    verify_log(logs, `tick_spacing: ${feetier.tickSpacing}`);
    verify_log(logs, `default_fee_rate: ${feetier.defaultFeeRate}`);
  });

  it("load fee tier 64 account", async () => {
    const feetier_pubkey = PDAUtil.getFeeTier(ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG, 64).publicKey;
    const feetier = await fetcher.getFeeTier(feetier_pubkey);

    const signature = await program.methods.verifyFeetierAccount().accounts({feetier: feetier_pubkey}).rpc();
    await connection.confirmTransaction(signature, "confirmed");

    const transaction = await connection.getParsedTransaction(signature, "confirmed");
    const logs = transaction.meta.logMessages;

    // verification
    verify_log(logs, `whirlpools_config: ${feetier.whirlpoolsConfig.toBase58()}`);
    verify_log(logs, `tick_spacing: ${feetier.tickSpacing}`);
    verify_log(logs, `default_fee_rate: ${feetier.defaultFeeRate}`);
  });

  it("load whirlpool account", async () => {
    const whirlpool = await fetcher.getPool(samo_usdc_whirlpool_pubkey);

    const signature = await program.methods.verifyWhirlpoolAccount().accounts({whirlpool: samo_usdc_whirlpool_pubkey}).rpc();
    await connection.confirmTransaction(signature, "confirmed");

    const transaction = await connection.getParsedTransaction(signature, "confirmed");
    const logs = transaction.meta.logMessages;

    // verification
    verify_log(logs, `whirlpools_config: ${whirlpool.whirlpoolsConfig.toBase58()}`);
    verify_log(logs, `whirlpool_bump: ${whirlpool.whirlpoolBump[0]}`);
    verify_log(logs, `tick_spacing: ${whirlpool.tickSpacing}`);
    verify_log(logs, `tick_spacing_seed: ${whirlpool.tickSpacing%256} ${Math.floor(whirlpool.tickSpacing/256)}`);
    verify_log(logs, `fee_rate: ${whirlpool.feeRate}`);
    verify_log(logs, `protocol_fee_rate: ${whirlpool.protocolFeeRate}`);
    verify_log(logs, `liquidity: ${whirlpool.liquidity.toString()}`);
    verify_log(logs, `sqrt_price: ${whirlpool.sqrtPrice.toString()}`);
    verify_log(logs, `tick_current_index: ${whirlpool.tickCurrentIndex}`);
    verify_log(logs, `protocol_fee_owed_a: ${whirlpool.protocolFeeOwedA.toString()}`);
    verify_log(logs, `protocol_fee_owed_b: ${whirlpool.protocolFeeOwedB.toString()}`);
    verify_log(logs, `token_mint_a: ${whirlpool.tokenMintA.toBase58()}`);
    verify_log(logs, `token_vault_a: ${whirlpool.tokenVaultA.toBase58()}`);
    verify_log(logs, `fee_growth_global_a: ${whirlpool.feeGrowthGlobalA.toString()}`);
    verify_log(logs, `token_mint_b: ${whirlpool.tokenMintB.toBase58()}`);
    verify_log(logs, `token_vault_b: ${whirlpool.tokenVaultB.toBase58()}`);
    verify_log(logs, `fee_growth_global_b: ${whirlpool.feeGrowthGlobalB.toString()}`);
    verify_log(logs, `reward_last_updated_timestamp: ${whirlpool.rewardLastUpdatedTimestamp.toString()}`);
    verify_log(logs, `reward_infos[0].mint: ${whirlpool.rewardInfos[0].mint.toBase58()}`);
    verify_log(logs, `reward_infos[0].vault: ${whirlpool.rewardInfos[0].vault.toBase58()}`);
    verify_log(logs, `reward_infos[0].authority: ${whirlpool.rewardInfos[0].authority.toBase58()}`);
    verify_log(logs, `reward_infos[0].emissions_per_second_x64: ${whirlpool.rewardInfos[0].emissionsPerSecondX64.toString()}`);
    verify_log(logs, `reward_infos[0].growth_global_x64: ${whirlpool.rewardInfos[0].growthGlobalX64.toString()}`);
    verify_log(logs, `reward_infos[1].mint: ${whirlpool.rewardInfos[1].mint.toBase58()}`);
    verify_log(logs, `reward_infos[1].vault: ${whirlpool.rewardInfos[1].vault.toBase58()}`);
    verify_log(logs, `reward_infos[1].authority: ${whirlpool.rewardInfos[1].authority.toBase58()}`);
    verify_log(logs, `reward_infos[1].emissions_per_second_x64: ${whirlpool.rewardInfos[1].emissionsPerSecondX64.toString()}`);
    verify_log(logs, `reward_infos[1].growth_global_x64: ${whirlpool.rewardInfos[1].growthGlobalX64.toString()}`);
    verify_log(logs, `reward_infos[2].mint: ${whirlpool.rewardInfos[2].mint.toBase58()}`);
    verify_log(logs, `reward_infos[2].vault: ${whirlpool.rewardInfos[2].vault.toBase58()}`);
    verify_log(logs, `reward_infos[2].authority: ${whirlpool.rewardInfos[2].authority.toBase58()}`);
    verify_log(logs, `reward_infos[2].emissions_per_second_x64: ${whirlpool.rewardInfos[2].emissionsPerSecondX64.toString()}`);
    verify_log(logs, `reward_infos[2].growth_global_x64: ${whirlpool.rewardInfos[2].growthGlobalX64.toString()}`);
  });

  it("load tickarray account", async () => {
    const whirlpool = await fetcher.getPool(samo_usdc_whirlpool_pubkey);
    const tickarray_pubkey = PDAUtil.getTickArrayFromTickIndex(
      whirlpool.tickCurrentIndex,
      whirlpool.tickSpacing,
      samo_usdc_whirlpool_pubkey,
      ORCA_WHIRLPOOL_PROGRAM_ID
    ).publicKey;
    const tickarray = await fetcher.getTickArray(tickarray_pubkey);

    const sampling_indexes = [0, 3, 15, 18, 21, 29, 50, 87];

    const signature = await program.methods.verifyTickarrayAccount(
      sampling_indexes[0], sampling_indexes[1], sampling_indexes[2], sampling_indexes[3],
      sampling_indexes[4], sampling_indexes[5], sampling_indexes[6], sampling_indexes[7],
    ).accounts({tickarray: tickarray_pubkey}).rpc();
    await connection.confirmTransaction(signature, "confirmed");

    const transaction = await connection.getParsedTransaction(signature, "confirmed");
    const logs = transaction.meta.logMessages;

    // verification
    verify_log(logs, `whirlpool: ${tickarray.whirlpool.toBase58()}`);
    verify_log(logs, `start_tick_index: ${tickarray.startTickIndex}`);
    for (let i=0; i<sampling_indexes.length; i++) {
      const index = sampling_indexes[i];
      const tick = tickarray.ticks[index];

      verify_log(logs, `ticks[${index}].initialized: ${tick.initialized}`);
      verify_log(logs, `ticks[${index}].liquidity_net: ${tick.liquidityNet.toString()}`);
      verify_log(logs, `ticks[${index}].liquidity_gross: ${tick.liquidityGross.toString()}`);
      verify_log(logs, `ticks[${index}].fee_growth_outside_a: ${tick.feeGrowthOutsideA.toString()}`);
      verify_log(logs, `ticks[${index}].fee_growth_outside_b: ${tick.feeGrowthOutsideB.toString()}`);
      verify_log(logs, `ticks[${index}].reward_growths_outside[0]: ${tick.rewardGrowthsOutside[0].toString()}`);
      verify_log(logs, `ticks[${index}].reward_growths_outside[1]: ${tick.rewardGrowthsOutside[1].toString()}`);
      verify_log(logs, `ticks[${index}].reward_growths_outside[2]: ${tick.rewardGrowthsOutside[2].toString()}`);
    }
  });

  it("load SOL/USDC position account", async () => {
    const position_pubkey = new PublicKey("5j3szbi2vnydYoyALNgttPD9YhCNwshUGkhzmzaP4WF7");
    const position = await fetcher.getPosition(position_pubkey);

    const signature = await program.methods.verifyPositionAccount().accounts({position: position_pubkey}).rpc();
    await connection.confirmTransaction(signature, "confirmed");

    const transaction = await connection.getParsedTransaction(signature, "confirmed");
    const logs = transaction.meta.logMessages;

    // verification
    verify_log(logs, `whirlpool: ${position.whirlpool.toBase58()}`);
    verify_log(logs, `position_mint: ${position.positionMint.toBase58()}`);
    verify_log(logs, `liquidity: ${position.liquidity.toString()}`);
    verify_log(logs, `tick_lower_index: ${position.tickLowerIndex}`);
    verify_log(logs, `tick_upper_index: ${position.tickUpperIndex}`);
    verify_log(logs, `fee_growth_checkpoint_a: ${position.feeGrowthCheckpointA}`);
    verify_log(logs, `fee_owed_a: ${position.feeOwedA}`);
    verify_log(logs, `fee_growth_checkpoint_b: ${position.feeGrowthCheckpointB}`);
    verify_log(logs, `fee_owed_b: ${position.feeOwedB}`);
    verify_log(logs, `reward_infos[0].growth_inside_checkpoint: ${position.rewardInfos[0].growthInsideCheckpoint}`);
    verify_log(logs, `reward_infos[0].amount_owed: ${position.rewardInfos[0].amountOwed}`);
    verify_log(logs, `reward_infos[1].growth_inside_checkpoint: ${position.rewardInfos[1].growthInsideCheckpoint}`);
    verify_log(logs, `reward_infos[1].amount_owed: ${position.rewardInfos[1].amountOwed}`);
    verify_log(logs, `reward_infos[2].growth_inside_checkpoint: ${position.rewardInfos[2].growthInsideCheckpoint}`);
    verify_log(logs, `reward_infos[2].amount_owed: ${position.rewardInfos[2].amountOwed}`);
  });

  it("load SAMO/USDC position account", async () => {
    const position_pubkey = new PublicKey("B66pRzGcKMmxRJ16KMkJMJoQWWhmyk4na4DPcv6X5ZRD");
    const position = await fetcher.getPosition(position_pubkey);

    const signature = await program.methods.verifyPositionAccount().accounts({position: position_pubkey}).rpc();
    await connection.confirmTransaction(signature, "confirmed");

    const transaction = await connection.getParsedTransaction(signature, "confirmed");
    const logs = transaction.meta.logMessages;

    // verification
    verify_log(logs, `whirlpool: ${position.whirlpool.toBase58()}`);
    verify_log(logs, `position_mint: ${position.positionMint.toBase58()}`);
    verify_log(logs, `liquidity: ${position.liquidity.toString()}`);
    verify_log(logs, `tick_lower_index: ${position.tickLowerIndex}`);
    verify_log(logs, `tick_upper_index: ${position.tickUpperIndex}`);
    verify_log(logs, `fee_growth_checkpoint_a: ${position.feeGrowthCheckpointA}`);
    verify_log(logs, `fee_owed_a: ${position.feeOwedA}`);
    verify_log(logs, `fee_growth_checkpoint_b: ${position.feeGrowthCheckpointB}`);
    verify_log(logs, `fee_owed_b: ${position.feeOwedB}`);
    verify_log(logs, `reward_infos[0].growth_inside_checkpoint: ${position.rewardInfos[0].growthInsideCheckpoint}`);
    verify_log(logs, `reward_infos[0].amount_owed: ${position.rewardInfos[0].amountOwed}`);
    verify_log(logs, `reward_infos[1].growth_inside_checkpoint: ${position.rewardInfos[1].growthInsideCheckpoint}`);
    verify_log(logs, `reward_infos[1].amount_owed: ${position.rewardInfos[1].amountOwed}`);
    verify_log(logs, `reward_infos[2].growth_inside_checkpoint: ${position.rewardInfos[2].growthInsideCheckpoint}`);
    verify_log(logs, `reward_infos[2].amount_owed: ${position.rewardInfos[2].amountOwed}`);
  });

  it("execute proxy swap SOL to USDC", async () => {
    const sol_usdc_whirlpool_oracle_pubkey = PDAUtil.getOracle(ORCA_WHIRLPOOL_PROGRAM_ID, sol_usdc_whirlpool_pubkey).publicKey;
    const sol_usdc_whirlpool = await fetcher.getPool(sol_usdc_whirlpool_pubkey);

    const sol_input = DecimalUtil.toU64(DecimalUtil.fromNumber(1000 /* SOL */), SOL.decimals);
    const wsol_ta = await resolveOrCreateATA(connection, wallet.publicKey, SOL.mint, rent_ta, sol_input);
    const usdc_ta = await resolveOrCreateATA(connection, wallet.publicKey, USDC.mint, rent_ta);

    const amount = new anchor.BN(sol_input);
    const other_amount_threshold = new anchor.BN(0);
    const amount_specified_is_input = true;
    const a_to_b = true;
    const sqrt_price_limit = SwapUtils.getDefaultSqrtPriceLimit(a_to_b);

    const tickarrays = SwapUtils.getTickArrayPublicKeys(
      sol_usdc_whirlpool.tickCurrentIndex,
      sol_usdc_whirlpool.tickSpacing,
      a_to_b,
      ORCA_WHIRLPOOL_PROGRAM_ID,
      sol_usdc_whirlpool_pubkey
    );

    const swap = await program.methods
      .proxySwap(
        amount,
        other_amount_threshold,
        sqrt_price_limit,
        amount_specified_is_input,
        a_to_b,
      )
      .accounts({
        whirlpoolProgram: ORCA_WHIRLPOOL_PROGRAM_ID,
        whirlpool: sol_usdc_whirlpool_pubkey,
        tokenAuthority: wallet.publicKey,
        tokenVaultA: sol_usdc_whirlpool.tokenVaultA,
        tokenVaultB: sol_usdc_whirlpool.tokenVaultB,
        tokenOwnerAccountA: wsol_ta.address,
        tokenOwnerAccountB: usdc_ta.address,
        tickArray0: tickarrays[0],
        tickArray1: tickarrays[1],
        tickArray2: tickarrays[2],
        oracle: sol_usdc_whirlpool_oracle_pubkey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    const transaction = new TransactionBuilder(connection, wallet)
    .addInstruction(wsol_ta)
    .addInstruction(usdc_ta)
    .addInstruction({instructions: [swap], cleanupInstructions: [], signers: []});

    // verification
    const quote = await swapQuoteByInputToken(
      await whirlpool_client.getPool(sol_usdc_whirlpool_pubkey, true),
      SOL.mint,
      sol_input,
      Percentage.fromFraction(0, 1000),
      ORCA_WHIRLPOOL_PROGRAM_ID,
      fetcher,
      true
    );

    const pre_usdc_ta = await fetcher.getTokenInfo(usdc_ta.address, true);
    const pre_usdc = pre_usdc_ta === null ? new anchor.BN(0) : pre_usdc_ta.amount;

    const signature = await transaction.buildAndExecute();
    await connection.confirmTransaction(signature);

    const post_usdc_ta = await fetcher.getTokenInfo(usdc_ta.address, true);
    const post_usdc = post_usdc_ta.amount;

    const usdc_output = post_usdc.sub(pre_usdc);
    assert(usdc_output.eq(quote.estimatedAmountOut));
    //console.log("usdc", usdc_output.toString());
  });

  it("execute proxy swap USDC to SAMO", async () => {
    const samo_usdc_whirlpool_oracle_pubkey = PDAUtil.getOracle(ORCA_WHIRLPOOL_PROGRAM_ID, samo_usdc_whirlpool_pubkey).publicKey;
    const samo_usdc_whirlpool = await fetcher.getPool(samo_usdc_whirlpool_pubkey);

    const usdc_input = DecimalUtil.toU64(DecimalUtil.fromNumber(2000 /* USDC */), USDC.decimals);
    const usdc_ta = await resolveOrCreateATA(connection, wallet.publicKey, USDC.mint, rent_ta);
    const samo_ta = await resolveOrCreateATA(connection, wallet.publicKey, SAMO.mint, rent_ta);

    const amount = new anchor.BN(usdc_input);
    const other_amount_threshold = new anchor.BN(0);
    const amount_specified_is_input = true;
    const a_to_b = false;
    const sqrt_price_limit = SwapUtils.getDefaultSqrtPriceLimit(a_to_b);

    const tickarrays = SwapUtils.getTickArrayPublicKeys(
      samo_usdc_whirlpool.tickCurrentIndex,
      samo_usdc_whirlpool.tickSpacing,
      a_to_b,
      ORCA_WHIRLPOOL_PROGRAM_ID,
      samo_usdc_whirlpool_pubkey
    );

    const swap = await program.methods
      .proxySwap(
        amount,
        other_amount_threshold,
        sqrt_price_limit,
        amount_specified_is_input,
        a_to_b,
      )
      .accounts({
        whirlpoolProgram: ORCA_WHIRLPOOL_PROGRAM_ID,
        whirlpool: samo_usdc_whirlpool_pubkey,
        tokenAuthority: wallet.publicKey,
        tokenVaultA: samo_usdc_whirlpool.tokenVaultA,
        tokenVaultB: samo_usdc_whirlpool.tokenVaultB,
        tokenOwnerAccountA: samo_ta.address,
        tokenOwnerAccountB: usdc_ta.address,
        tickArray0: tickarrays[0],
        tickArray1: tickarrays[1],
        tickArray2: tickarrays[2],
        oracle: samo_usdc_whirlpool_oracle_pubkey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    const transaction = new TransactionBuilder(connection, wallet)
    .addInstruction(samo_ta)
    .addInstruction(usdc_ta)
    .addInstruction({instructions: [swap], cleanupInstructions: [], signers: []});

    // verification
    const quote = await swapQuoteByInputToken(
      await whirlpool_client.getPool(samo_usdc_whirlpool_pubkey, true),
      USDC.mint,
      usdc_input,
      Percentage.fromFraction(0, 1000),
      ORCA_WHIRLPOOL_PROGRAM_ID,
      fetcher,
      true
    );

    const pre_samo_ta = await fetcher.getTokenInfo(samo_ta.address, true);
    const pre_samo = pre_samo_ta === null ? new anchor.BN(0) : pre_samo_ta.amount;

    const signature = await transaction.buildAndExecute();
    await connection.confirmTransaction(signature);

    const post_samo_ta = await fetcher.getTokenInfo(samo_ta.address, true);
    const post_samo = post_samo_ta.amount;

    const samo_output = post_samo.sub(pre_samo);
    assert(samo_output.eq(quote.estimatedAmountOut));
    //console.log("samo", samo_output.toString());
  });

  it("execute proxy open_position", async () => {
    const position_ta = await deriveATA(wallet.publicKey, position_mint);

    const bumps = { positionBump: position_pda.bump };
    const tick_lower_index = PriceMath.priceToInitializableTickIndex(DecimalUtil.fromNumber(0.01), SAMO.decimals, USDC.decimals, 64);
    const tick_upper_index = PriceMath.priceToInitializableTickIndex(DecimalUtil.fromNumber(0.02), SAMO.decimals, USDC.decimals, 64);

    const open_position = await program.methods
      .proxyOpenPosition(
        bumps,
        tick_lower_index,
        tick_upper_index,
      )
      .accounts({
        whirlpoolProgram: ORCA_WHIRLPOOL_PROGRAM_ID,
        funder: wallet.publicKey,
        owner: wallet.publicKey,
        position: position_pda.publicKey,
        positionMint: position_mint,
        positionTokenAccount: position_ta,
        whirlpool: samo_usdc_whirlpool_pubkey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .instruction();

    const transaction = new TransactionBuilder(connection, wallet)
    .addInstruction({instructions: [open_position], cleanupInstructions: [], signers: [position_mint_keypair]});

    const signature = await transaction.buildAndExecute();
    await connection.confirmTransaction(signature);

    const position_data = await fetcher.getPosition(position_pda.publicKey, true);
    assert(position_data.positionMint.equals(position_mint));
    assert(position_data.whirlpool.equals(samo_usdc_whirlpool_pubkey));
    assert(position_data.tickLowerIndex === tick_lower_index);
    assert(position_data.tickUpperIndex === tick_upper_index);
    assert(position_data.liquidity.isZero());
  });

  it("execute proxy increase_liquidity", async () => {
    const samo_usdc_whirlpool = await whirlpool_client.getPool(samo_usdc_whirlpool_pubkey, true);
    const position_data = await fetcher.getPosition(position_pda.publicKey, true);

    const quote = increaseLiquidityQuoteByInputToken(
      SAMO.mint,
      DecimalUtil.fromNumber(100000),
      position_data.tickLowerIndex,
      position_data.tickUpperIndex,
      Percentage.fromFraction(0, 1000),
      samo_usdc_whirlpool,
    );

    const increase_liquidity = await program.methods
      .proxyIncreaseLiquidity(
        quote.liquidityAmount,
        quote.tokenMaxA,
        quote.tokenMaxB,
      )
      .accounts({
        whirlpoolProgram: ORCA_WHIRLPOOL_PROGRAM_ID,
        whirlpool: samo_usdc_whirlpool_pubkey,
        tokenProgram: TOKEN_PROGRAM_ID,
        positionAuthority: wallet.publicKey,
        position: position_pda.publicKey,
        positionTokenAccount: await deriveATA(wallet.publicKey, position_mint),
        tokenOwnerAccountA: await deriveATA(wallet.publicKey, SAMO.mint),
        tokenOwnerAccountB: await deriveATA(wallet.publicKey, USDC.mint),
        tokenVaultA: samo_usdc_whirlpool.getData().tokenVaultA,
        tokenVaultB: samo_usdc_whirlpool.getData().tokenVaultB,
        tickArrayLower: PDAUtil.getTickArrayFromTickIndex(position_data.tickLowerIndex, 64, samo_usdc_whirlpool_pubkey, ORCA_WHIRLPOOL_PROGRAM_ID).publicKey,
        tickArrayUpper: PDAUtil.getTickArrayFromTickIndex(position_data.tickUpperIndex, 64, samo_usdc_whirlpool_pubkey, ORCA_WHIRLPOOL_PROGRAM_ID).publicKey,
      })
      .instruction();

    const transaction = new TransactionBuilder(connection, wallet)
    .addInstruction({instructions: [increase_liquidity], cleanupInstructions: [], signers: []});

    const signature = await transaction.buildAndExecute();
    await connection.confirmTransaction(signature);

    const post_position_data = await fetcher.getPosition(position_pda.publicKey, true);
    const delta_liquidity = post_position_data.liquidity.sub(position_data.liquidity);
    assert(delta_liquidity.eq(quote.liquidityAmount));
  });

  it("generate fees and rewards", async () => {
    // generate rewards
    await sleep(5);

    // generate fees
    const samo_usdc_whirlpool = await whirlpool_client.getPool(samo_usdc_whirlpool_pubkey, true);
    const usdc_samo_quote = await swapQuoteByInputToken(
      samo_usdc_whirlpool,
      USDC.mint,
      DecimalUtil.toU64(DecimalUtil.fromNumber(1000), USDC.decimals),
      Percentage.fromFraction(0, 1000),
      ORCA_WHIRLPOOL_PROGRAM_ID,
      fetcher,
      true
    );
    const signature1 = await (await samo_usdc_whirlpool.swap(usdc_samo_quote)).buildAndExecute();
    await connection.confirmTransaction(signature1);

    const samo_usdc_quote = await swapQuoteByInputToken(
      samo_usdc_whirlpool,
      SAMO.mint,
      usdc_samo_quote.estimatedAmountOut,
      Percentage.fromFraction(0, 1000),
      ORCA_WHIRLPOOL_PROGRAM_ID,
      fetcher,
      true
    );
    const signature2 = await (await samo_usdc_whirlpool.swap(samo_usdc_quote)).buildAndExecute();
    await connection.confirmTransaction(signature2);
  });

  it("execute proxy update_fees_and_rewards", async () => {
    const samo_usdc_whirlpool = await whirlpool_client.getPool(samo_usdc_whirlpool_pubkey, true);

    const position_data = await fetcher.getPosition(position_pda.publicKey, true);

    const pre_last_updated = (await samo_usdc_whirlpool.refreshData()).rewardLastUpdatedTimestamp;

    const update_fees_and_rewards = await program.methods
      .proxyUpdateFeesAndRewards()
      .accounts({
        whirlpoolProgram: ORCA_WHIRLPOOL_PROGRAM_ID,
        whirlpool: samo_usdc_whirlpool_pubkey,
        position: position_pda.publicKey,
        tickArrayLower: PDAUtil.getTickArrayFromTickIndex(position_data.tickLowerIndex, 64, samo_usdc_whirlpool_pubkey, ORCA_WHIRLPOOL_PROGRAM_ID).publicKey,
        tickArrayUpper: PDAUtil.getTickArrayFromTickIndex(position_data.tickUpperIndex, 64, samo_usdc_whirlpool_pubkey, ORCA_WHIRLPOOL_PROGRAM_ID).publicKey,
      })
      .instruction();

    const transaction = new TransactionBuilder(connection, wallet)
    .addInstruction({instructions: [update_fees_and_rewards], cleanupInstructions: [], signers: []});

    const signature = await transaction.buildAndExecute();
    await connection.confirmTransaction(signature);

    const post_last_updated = (await samo_usdc_whirlpool.refreshData()).rewardLastUpdatedTimestamp;
    assert(post_last_updated.gt(pre_last_updated));
  });

  it("execute proxy decrease_liquidity", async () => {
    const samo_usdc_whirlpool = await whirlpool_client.getPool(samo_usdc_whirlpool_pubkey, true);

    const position_data = await fetcher.getPosition(position_pda.publicKey, true);

    const quote = await decreaseLiquidityQuoteByLiquidity(
      position_data.liquidity,
      Percentage.fromFraction(0, 1000),
      await whirlpool_client.getPosition(position_pda.publicKey),
      samo_usdc_whirlpool,
    );

    const decrease_liquidity = await program.methods
      .proxyDecreaseLiquidity(
        quote.liquidityAmount,
        quote.tokenMinA,
        quote.tokenMinB,
      )
      .accounts({
        whirlpoolProgram: ORCA_WHIRLPOOL_PROGRAM_ID,
        whirlpool: samo_usdc_whirlpool_pubkey,
        tokenProgram: TOKEN_PROGRAM_ID,
        positionAuthority: wallet.publicKey,
        position: position_pda.publicKey,
        positionTokenAccount: await deriveATA(wallet.publicKey, position_mint),
        tokenOwnerAccountA: await deriveATA(wallet.publicKey, SAMO.mint),
        tokenOwnerAccountB: await deriveATA(wallet.publicKey, USDC.mint),
        tokenVaultA: samo_usdc_whirlpool.getData().tokenVaultA,
        tokenVaultB: samo_usdc_whirlpool.getData().tokenVaultB,
        tickArrayLower: PDAUtil.getTickArrayFromTickIndex(position_data.tickLowerIndex, 64, samo_usdc_whirlpool_pubkey, ORCA_WHIRLPOOL_PROGRAM_ID).publicKey,
        tickArrayUpper: PDAUtil.getTickArrayFromTickIndex(position_data.tickUpperIndex, 64, samo_usdc_whirlpool_pubkey, ORCA_WHIRLPOOL_PROGRAM_ID).publicKey,
      })
      .instruction();

    const transaction = new TransactionBuilder(connection, wallet)
    .addInstruction({instructions: [decrease_liquidity], cleanupInstructions: [], signers: []});

    const signature = await transaction.buildAndExecute();
    await connection.confirmTransaction(signature);

    const post_position_data = await fetcher.getPosition(position_pda.publicKey, true);
    const delta_liquidity = position_data.liquidity.sub(post_position_data.liquidity);
    assert(delta_liquidity.eq(quote.liquidityAmount));
  });

  it("execute proxy collect_fees", async () => {
    const samo_usdc_whirlpool = await whirlpool_client.getPool(samo_usdc_whirlpool_pubkey, true);

    const position_data = await fetcher.getPosition(position_pda.publicKey, true);

    assert(!position_data.feeOwedA.isZero());
    assert(!position_data.feeOwedB.isZero());
    //console.log("fee", position_data.feeOwedA.toString(), position_data.feeOwedB.toString());

    const collect_fees = await program.methods
      .proxyCollectFees()
      .accounts({
        whirlpoolProgram: ORCA_WHIRLPOOL_PROGRAM_ID,
        whirlpool: samo_usdc_whirlpool_pubkey,
        positionAuthority: wallet.publicKey,
        position: position_pda.publicKey,
        positionTokenAccount: await deriveATA(wallet.publicKey, position_mint),
        tokenOwnerAccountA: await deriveATA(wallet.publicKey, SAMO.mint),
        tokenVaultA: samo_usdc_whirlpool.getData().tokenVaultA,
        tokenOwnerAccountB: await deriveATA(wallet.publicKey, USDC.mint),
        tokenVaultB: samo_usdc_whirlpool.getData().tokenVaultB,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    const transaction = new TransactionBuilder(connection, wallet)
    .addInstruction({instructions: [collect_fees], cleanupInstructions: [], signers: []});

    const signature = await transaction.buildAndExecute();
    await connection.confirmTransaction(signature);

    const post_position_data = await fetcher.getPosition(position_pda.publicKey, true);
    assert(post_position_data.feeOwedA.isZero());
    assert(post_position_data.feeOwedB.isZero());
  });

  it("execute proxy collect_reward", async () => {
    const samo_usdc_whirlpool = await whirlpool_client.getPool(samo_usdc_whirlpool_pubkey, true);
    const samo_usdc_whirlpool_data = samo_usdc_whirlpool.getData();

    const position_data = await fetcher.getPosition(position_pda.publicKey, true);

    for (let reward_index=0; reward_index<3; reward_index++) {
      const reward_info = samo_usdc_whirlpool_data.rewardInfos[reward_index];
      if ( !PoolUtil.isRewardInitialized(reward_info) ) {
        assert(reward_index === 2);
        break;
      }

      const reward_ta = await resolveOrCreateATA(connection, wallet.publicKey, reward_info.mint, rent_ta);

      assert(!position_data.rewardInfos[reward_index].amountOwed.isZero());
      //console.log("reward", position_data.rewardInfos[reward_index].amountOwed.toString());

      const collect_reward = await program.methods
        .proxyCollectReward(
          reward_index
        )
        .accounts({
          whirlpoolProgram: ORCA_WHIRLPOOL_PROGRAM_ID,
          whirlpool: samo_usdc_whirlpool_pubkey,
          positionAuthority: wallet.publicKey,
          position: position_pda.publicKey,
          positionTokenAccount: await deriveATA(wallet.publicKey, position_mint),
          rewardOwnerAccount: reward_ta.address,
          rewardVault: reward_info.vault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();

      const transaction = new TransactionBuilder(connection, wallet)
      .addInstruction(reward_ta)
      .addInstruction({instructions: [collect_reward], cleanupInstructions: [], signers: []});

      const signature = await transaction.buildAndExecute();
      await connection.confirmTransaction(signature);

      const post_position_data = await fetcher.getPosition(position_pda.publicKey, true);
      assert(post_position_data.rewardInfos[reward_index].amountOwed.isZero());
    }
  });

  it("execute proxy close_position", async () => {
    const position_data = await fetcher.getPosition(position_pda.publicKey, true);
    assert(position_data !== null);

    const close_position = await program.methods
      .proxyClosePosition()
      .accounts({
        whirlpoolProgram: ORCA_WHIRLPOOL_PROGRAM_ID,
        positionAuthority: wallet.publicKey,
        receiver: wallet.publicKey,
        position: position_pda.publicKey,
        positionMint: position_mint,
        positionTokenAccount: await deriveATA(wallet.publicKey, position_mint),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    const transaction = new TransactionBuilder(connection, wallet)
    .addInstruction({instructions: [close_position], cleanupInstructions: [], signers: []});

    const signature = await transaction.buildAndExecute();
    await connection.confirmTransaction(signature);

    const post_position_data = await fetcher.getPosition(position_pda.publicKey, true);
    assert(post_position_data === null);
  });

});
