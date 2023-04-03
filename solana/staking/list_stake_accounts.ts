import { Connection, PublicKey, StakeProgram, ParsedInstruction } from "@solana/web3.js";

// special thanks: https://solana.stackexchange.com/questions/3571/getting-staking-accounts-of-wallet
async function main() {

  // this RPC MUST SUPPORT getProgramAccounts method (some RPC server disables it)
  const RPC_ENDPOINT_URL = process.env["RPC_ENDPOINT_URL"];

  // delegate Tx1: https://solscan.io/tx/35Fs9HmV9nCjvoR2JQb1WqepKMALpAfAAQGEFXB9ZfHNxZu3pJREzDw2U4Ls1Nk12Psdg1peC6kwYUYGbsfoZM1S
  // delegate Tx2: https://solscan.io/tx/3PSRnHsha1WKE1KGCvvsLepJBpDG2sCyNQuquNQnrUUh5HJ4x8paRCKrCKn24US4GHeFusME3KdZbEQQhEx9c22L
  const TARGET_WALLET_ADDRESS = new PublicKey("r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6");

  const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");

  // list all existing stake accounts
  //
  //   Stake accounts that have already been deleted cannot be detected.
  //   If you want to check for stake accounts that existed in the past,
  //   you would have to go back through all the transactions related to the wallet.
  const stakeAccounts = await connection.getProgramAccounts(
    StakeProgram.programId,
    {
      // https://github.com/solana-labs/solana/blob/master/sdk/program/src/stake/state.rs
      // 4  bytes: enum
      // 8  bytes: Meta.rent_exempt_reserve u64
      // 32 bytes: Meta.authorized.staker Pubkey
      // 32 bytes: Meta.authorized.withdrawer Pubkey
      // 8  bytes: Meta.lockup.unix_timestamp UnixTimestamp
      // 8  bytes: Meta.lockup.epoch Epoch
      // 32 bytes: Meta.lockup.custodian Pubkey
      // 8  bytes: Stake.delegation.voter_pubkey Pubkey
      // 8  bytes: Stake.delegation.stake u64
      // 8  bytes: Stake.delegation.activation_epoch Epoch
      // 8  bytes: Stake.delegation.deactivation_epoch Epoch
      // 8  bytes: Stake.delegation.warmup_cooldown_rate f64
      // 8  bytes: Stake.delegation.credits_observed u64
      filters: [
        { dataSize: 200 },
        { memcmp: {offset: 12 /* staker pubkey */, bytes: TARGET_WALLET_ADDRESS.toBase58()} },
      ],
      encoding: "base64",
    },
  );

  for (const stakeAccount of stakeAccounts) {
    console.log("stakeAccount:", stakeAccount.pubkey.toBase58());

    // get transactions related to stakeAccount
    const signatureInfos = await connection.getSignaturesForAddress(stakeAccount.pubkey); // TODO: pagenation if many it has many transactions
    const signatures = signatureInfos.map((signatureInfo) => signatureInfo.signature);
    const transactions = await connection.getParsedTransactions(signatures, {maxSupportedTransactionVersion: 0});

    // print StakeProgram instructions included in the transactions
    transactions.forEach((tx) => {
      console.log("\ttransaction:", tx.transaction.signatures[0], "slot", tx.slot, "blockTime", new Date(tx.blockTime * 1000).toISOString());
      tx.transaction.message.instructions.forEach((instruction) => {
        if (instruction.programId.equals(StakeProgram.programId)) {
          const parsed = instruction as ParsedInstruction;
          console.log("\t\tinstruction:", parsed.program, parsed.parsed.type);
        }
      });
    });
  }
}

main();

/*

SAMPLE OUTPUT:

$ ts-node src/staking/list_stake_accounts.ts 
stakeAccount: BPWgYjN951tfA1ydscAZCZuyNDR7HeUt6zcPAtrUBWjh
        transaction: 35Fs9HmV9nCjvoR2JQb1WqepKMALpAfAAQGEFXB9ZfHNxZu3pJREzDw2U4Ls1Nk12Psdg1peC6kwYUYGbsfoZM1S slot 186333144 blockTime 2023-04-03T16:58:28.000Z
                instruction: stake initialize
                instruction: stake delegate
stakeAccount: CE9fGZMzSaD5FN3TtUp36oEyR6uGANPapkiW4EGVVjcV
        transaction: 3PSRnHsha1WKE1KGCvvsLepJBpDG2sCyNQuquNQnrUUh5HJ4x8paRCKrCKn24US4GHeFusME3KdZbEQQhEx9c22L slot 186341401 blockTime 2023-04-03T18:03:28.000Z
                instruction: stake initialize
                instruction: stake delegate

*/
