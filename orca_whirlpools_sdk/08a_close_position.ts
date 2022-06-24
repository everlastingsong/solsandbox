import { PublicKey } from "@solana/web3.js";
import {
  WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
  PDAUtil, WhirlpoolIx, collectFeesQuote, TickArrayUtil,
  collectRewardsQuote, decreaseLiquidityQuoteByLiquidityWithParams
} from "@orca-so/whirlpools-sdk";
import { Provider } from "@project-serum/anchor";
import {
  Percentage, deriveATA, Instruction, EMPTY_INSTRUCTION,
  resolveOrCreateATA, TransactionBuilder } from "@orca-so/common-sdk";
import Decimal from "decimal.js";

// bash$ export ANCHOR_PROVIDER_URL=https://ssc-dao.genesysgo.net
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts
const provider = Provider.env();
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());

async function main() {
  const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
  const fetcher = new AccountFetcher(ctx.connection);
  const client = buildWhirlpoolClient(ctx, fetcher);

  // to get positions, use 06a_list_whirlpool_positions.ts
  const MY_POSITION = new PublicKey("3dX6SdHNTQwj27f1fm79DjnZD1wjE1AvsW16mAz7UzFY");
  const MY_POSITION_OWNER = ctx.wallet.publicKey;
  const ACCEPTABLE_SLIPPAGE = Percentage.fromDecimal(new Decimal("0.5") /* % */);

  // STEPs to close position
  // reference TX: https://solscan.io/tx/4Ws6FvoCpUdcGnWcbsER4dfyGATGdYvSdFEG5xsnxd4Mgdo2YvBpC44eQuyjdLbqDTKtFsbAj4GfHypBnqj15sMT
  // reference for 1,2,3,4: https://orca-so.gitbook.io/orca-developer-portal/whirlpools/interacting-with-the-protocol/position-management/collect-fees-and-rewards
  // reference for 5: https://orca-so.gitbook.io/orca-developer-portal/whirlpools/interacting-with-the-protocol/position-management/modifying-liquidity
  // reference for 6: https://orca-so.gitbook.io/orca-developer-portal/whirlpools/interacting-with-the-protocol/position-management/closing-a-position
  //
  // 1a. create WSOL temporary account (if (W)SOL is one token of pair or rewards)
  // 1b. create missing accounts to receive depositted tokens and rewards
  // 2. UpdateFeeAndRewards
  // 3. CollectFees
  // 4. CollectReward
  // 5. DecreaseLiquidity
  // 6. ClosePosition
  // 7. close WSOL temporary account (if created)

  // get info of position & pool
  const position_pubkey = MY_POSITION;
  const position_owner = MY_POSITION_OWNER;
  const acceptable_slippage = ACCEPTABLE_SLIPPAGE;
  const position = await client.getPosition(position_pubkey);
  const position_token_account = await deriveATA(position_owner, position.getData().positionMint);
  const whirlpool_pubkey = position.getData().whirlpool;
  const whirlpool = await client.getPool(whirlpool_pubkey);
  const token_a = whirlpool.getTokenAInfo();
  const token_b = whirlpool.getTokenBInfo();
  const tick_spacing = whirlpool.getData().tickSpacing;
  const tick_array_lower_pubkey = PDAUtil.getTickArrayFromTickIndex(position.getData().tickLowerIndex, tick_spacing, whirlpool_pubkey, ctx.program.programId).publicKey;
  const tick_array_upper_pubkey = PDAUtil.getTickArrayFromTickIndex(position.getData().tickUpperIndex, tick_spacing, whirlpool_pubkey, ctx.program.programId).publicKey;
  const tick_array_lower = await fetcher.getTickArray(tick_array_lower_pubkey);
  const tick_array_upper = await fetcher.getTickArray(tick_array_upper_pubkey);
  const tick_lower = TickArrayUtil.getTickFromArray(tick_array_lower, position.getData().tickLowerIndex, tick_spacing);
  const tick_upper = TickArrayUtil.getTickFromArray(tick_array_upper, position.getData().tickUpperIndex, tick_spacing);

  // calculate fee & rewards at off-chain/client-side
  const fee_quote = collectFeesQuote({
    whirlpool: whirlpool.getData(),
    position: position.getData(),
    tickLower: tick_lower,
    tickUpper: tick_upper
  });
  const reward_quote = collectRewardsQuote({
    whirlpool: whirlpool.getData(),
    position: position.getData(),
    tickLower: tick_lower,
    tickUpper: tick_upper
  });

  const zero_fee = fee_quote.feeOwedA.isZero() && fee_quote.feeOwedB.isZero();
  const zero_rewards = [
    reward_quote[0] === undefined || reward_quote[0].isZero(),
    reward_quote[1] === undefined || reward_quote[1].isZero(),
    reward_quote[2] === undefined || reward_quote[2].isZero(),
  ];
  const zero_reward = zero_rewards[0] && zero_rewards[1] && zero_rewards[2];

  // 1a. create WSOL temporary account (if (W)SOL is one token of pair or rewards)
  // 1b. create missing accounts to receive depositted tokens and rewards
  // 7. close WSOL account (if created)
  const tokens_to_be_collected = new Set<string>();
  tokens_to_be_collected.add(token_a.mint.toBase58()).add(token_b.mint.toBase58());
  if ( !zero_rewards[0] ) tokens_to_be_collected.add(whirlpool.getData().rewardInfos[0].mint.toBase58());
  if ( !zero_rewards[1] ) tokens_to_be_collected.add(whirlpool.getData().rewardInfos[1].mint.toBase58());
  if ( !zero_rewards[2] ) tokens_to_be_collected.add(whirlpool.getData().rewardInfos[2].mint.toBase58());

  // ATTENTION)
  // WSOL account is NOT ATA, just temporary account
  // deriveATA(WSOL.mint) != resolveOrCreateATA(WSOL.mint), so use token_account_map
  const required_ata_ix: Instruction[] = [];
  const token_account_map = new Map<string, PublicKey>();
  for ( let mint_b58 of tokens_to_be_collected ) {
    const mint = new PublicKey(mint_b58);
    const {address, ...ix} = await resolveOrCreateATA(
      ctx.connection,
      position_owner,
      mint,
      () => fetcher.getAccountRentExempt()
    );
    required_ata_ix.push(ix);
    token_account_map.set(mint_b58, address);
  }

  // 2. UpdateFeeAndRewards (if fee or reward are non-zero)
  let update_fee_and_rewards_ix = EMPTY_INSTRUCTION;
  if ( !zero_fee || !zero_reward ) {
    update_fee_and_rewards_ix = WhirlpoolIx.updateFeesAndRewardsIx(
      ctx.program,
      {
        whirlpool: position.getData().whirlpool,
        position: position_pubkey,
        tickArrayLower: tick_array_lower_pubkey,
        tickArrayUpper: tick_array_upper_pubkey,
      }
    );
  }
  
  // 3. CollectFees (if fee is non-zero)
  let collect_fees_ix = EMPTY_INSTRUCTION;
  if ( !zero_fee ) {
    collect_fees_ix = WhirlpoolIx.collectFeesIx(
      ctx.program,
      {
        whirlpool: whirlpool_pubkey,
        position: position_pubkey,
        positionAuthority: position_owner,
        positionTokenAccount: position_token_account,
        tokenOwnerAccountA: token_account_map.get(token_a.mint.toBase58()),
        tokenOwnerAccountB: token_account_map.get(token_b.mint.toBase58()),
        tokenVaultA: whirlpool.getData().tokenVaultA, 
        tokenVaultB: whirlpool.getData().tokenVaultB,
      }
    );
  }

  // 4. CollectReward
  const collect_reward_ix = [EMPTY_INSTRUCTION, EMPTY_INSTRUCTION, EMPTY_INSTRUCTION];
  for (let i=0; i<zero_rewards.length; i++) {
    if ( zero_rewards[i] ) continue;

    const reward_info = whirlpool.getData().rewardInfos[i];
    collect_reward_ix[i] = WhirlpoolIx.collectRewardIx(
      ctx.program,
      {
        whirlpool: whirlpool_pubkey,
        position: position_pubkey,
        positionAuthority: position_owner,
        positionTokenAccount: position_token_account,
        rewardIndex: i,
        rewardOwnerAccount: token_account_map.get(reward_info.mint.toBase58()),
        rewardVault: reward_info.vault,
      }
    );
  }

  // 5. DecreaseLiquidity
  const decrease_liquidity_input = decreaseLiquidityQuoteByLiquidityWithParams({
    liquidity: position.getData().liquidity,
    tickCurrentIndex: whirlpool.getData().tickCurrentIndex,
    sqrtPrice: whirlpool.getData().sqrtPrice,
    tickLowerIndex: position.getData().tickLowerIndex,
    tickUpperIndex: position.getData().tickUpperIndex,
    slippageTolerance: acceptable_slippage,
  });

  const decrease_liquidity_ix = WhirlpoolIx.decreaseLiquidityIx(
    ctx.program,
    {
      ...decrease_liquidity_input,
      whirlpool: whirlpool_pubkey,
      position: position_pubkey,
      positionAuthority: position_owner,
      positionTokenAccount: position_token_account,
      tokenOwnerAccountA: token_account_map.get(token_a.mint.toBase58()),
      tokenOwnerAccountB: token_account_map.get(token_b.mint.toBase58()),
      tokenVaultA: whirlpool.getData().tokenVaultA, 
      tokenVaultB: whirlpool.getData().tokenVaultB,
      tickArrayLower: tick_array_lower_pubkey,
      tickArrayUpper: tick_array_upper_pubkey,
    }
  );
  
  // 6. ClosePosition
  const close_position_ix = WhirlpoolIx.closePositionIx(
    ctx.program,
    {
      position: position_pubkey,
      positionAuthority: position_owner,
      positionTokenAccount: position_token_account,
      positionMint: position.getData().positionMint,
      receiver: position_owner,
    }
  );

  // build TX
  const tx_builder = new TransactionBuilder(ctx.provider);

  required_ata_ix.map((ix) => tx_builder.addInstruction(ix));
  tx_builder
    .addInstruction(update_fee_and_rewards_ix)
    .addInstruction(collect_fees_ix)
    .addInstruction(collect_reward_ix[0])
    .addInstruction(collect_reward_ix[1])
    .addInstruction(collect_reward_ix[2])
    .addInstruction(decrease_liquidity_ix)
    .addInstruction(close_position_ix);

  // simulation
  const {transaction: tx, signers} = await tx_builder.build();
  tx.feePayer = ctx.wallet.publicKey;
  tx.recentBlockhash = (await ctx.connection.getLatestBlockhash()).blockhash;
  signers.map((signer) => tx.partialSign(signer));
  const payer_signed_tx = await ctx.wallet.signTransaction(tx);
  const simulation_response = await ctx.connection.simulateTransaction(payer_signed_tx.compileMessage());
  console.log(simulation_response);

  // execute transaction
  if ( simulation_response.value.err === null ) {
    const signature = await tx_builder.buildAndExecute();
    console.log("signature", signature);
    await ctx.connection.confirmTransaction(signature);
  }
}

main();

/*
SOLSCAN:

https://solscan.io/tx/fpS6VNFpZ3zYRxVhJda597h4J4PZbz7hr3GEBtjtpiSoAbykuuxte6ykXuzjrYNTWFMVphisxTnktVyBTAbpHKN

SAMPLE OUTPUT:

$ ts-node 08a_close_position.ts 
connection endpoint https://ssc-dao.genesysgo.net
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
{
  context: { slot: 135396171 },
  value: {
    accounts: null,
    err: null,
    logs: [
      'Program 11111111111111111111111111111111 invoke [1]',
      'Program 11111111111111111111111111111111 success',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]',
      'Program log: Instruction: InitializeAccount',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 3392 of 1400000 compute units',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
      'Program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc invoke [1]',
      'Program log: Instruction: UpdateFeesAndRewards',
      'Program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc consumed 15622 of 1396608 compute units',
      'Program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc success',
      'Program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc invoke [1]',
      'Program log: Instruction: CollectFees',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
      'Program log: Instruction: Transfer',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 2755 of 1366113 compute units',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
      'Program log: Instruction: Transfer',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 2643 of 1359808 compute units',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
      'Program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc consumed 27329 of 1380986 compute units',
      'Program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc success',
      'Program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc invoke [1]',
      'Program log: Instruction: CollectReward',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
      'Program log: Instruction: Transfer',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 2643 of 1340785 compute units',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
      'Program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc consumed 18663 of 1353657 compute units',
      'Program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc success',
      'Program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc invoke [1]',
      'Program log: Instruction: DecreaseLiquidity',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
      'Program log: Instruction: Transfer',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 2755 of 1310077 compute units',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
      'Program log: Instruction: Transfer',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 2703 of 1303772 compute units',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
      'Program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc consumed 41897 of 1334994 compute units',
      'Program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc success',
      'Program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc invoke [1]',
      'Program log: Instruction: ClosePosition',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
      'Program log: Instruction: BurnChecked',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 2447 of 1284381 compute units',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
      'Program log: Instruction: CloseAccount',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 1717 of 1278655 compute units',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
      'Program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc consumed 17670 of 1293097 compute units',
      'Program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc success',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]',
      'Program log: Instruction: CloseAccount',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 1713 of 1275427 compute units',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success'
    ],
    unitsConsumed: 126286
  }
}
signature fpS6VNFpZ3zYRxVhJda597h4J4PZbz7hr3GEBtjtpiSoAbykuuxte6ykXuzjrYNTWFMVphisxTnktVyBTAbpHKN

*/
