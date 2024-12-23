import { Connection, PublicKey, GetVersionedTransactionConfig, TransactionResponse, SystemProgram, SystemInstruction, ComputeBudgetProgram } from "@solana/web3.js";
import * as prompt from "prompt";
import base58 from "bs58";
import fs from "fs";
import invariant from "tiny-invariant";

////////////////////////////////////////////////////////////////////////////////
// utils
////////////////////////////////////////////////////////////////////////////////
const BPF_LOADER_UPGRADABLE_LOADER = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");

// see: https://docs.rs/solana-program/latest/src/solana_program/bpf_loader_upgradeable.rs.html#29
const PROGRAM_DATA_META_SIZE = 4 + 8 + 1 + 32; // enum + u64(deploySlot) + Option<Pubkey(auth)>
const BUFFER_META_SIZE = 4 + 1 + 32; // enum + Option<Pubkey(auth)>

async function isUpgradableProgramAccount(connection: Connection, programId: PublicKey): Promise<boolean> {
  const accountInfo = await connection.getAccountInfo(programId);
  if (!accountInfo) return false;
  if (!accountInfo.owner.equals(BPF_LOADER_UPGRADABLE_LOADER)) return false;
  const accountType = accountInfo.data.readUint32LE(0);
  return accountType === 2; // 2:Program
}

async function getUpgradableProgramDataAccountSize(connection: Connection, programId: PublicKey): Promise<number> {
  const accountInfo = await connection.getAccountInfo(programId);
  invariant(!!accountInfo, "account not found");
  invariant(!!accountInfo.owner.equals(BPF_LOADER_UPGRADABLE_LOADER), "not upgradable program account");
  const accountType = accountInfo.data.readUint32LE(0);
  invariant(accountType === 2, "not program account");

  const programDataAccountPubkey = new PublicKey(accountInfo.data.slice(4, 36));
  const programDataAccountInfo = await connection.getAccountInfo(programDataAccountPubkey);
  invariant(!!programDataAccountInfo, "program data account not found");
  const programDataAccountSize = programDataAccountInfo.data.length;
  return programDataAccountSize;
}

function isInitializeBufferTransaction(tx: TransactionResponse, bufferAccountPubkey: PublicKey): boolean {
  const transaction = tx.transaction;
  const keys = transaction.message.accountKeys;
  const instructions = transaction.message.instructions.filter((tx) => !keys[tx.programIdIndex].equals(ComputeBudgetProgram.programId));

  if (instructions.length !== 2) return false;

  // System Program: Create Account(0)
  if (!keys[instructions[0].programIdIndex].equals(SystemProgram.programId)) return false;
  const systemProgramInstructionCode = Buffer.from(base58.decode(instructions[0].data).slice(0, 4)).readUInt32LE(0);
  if (systemProgramInstructionCode !== 0) return false;
  if (!keys[instructions[0].accounts[1]].equals(bufferAccountPubkey)) return false;

  // BPF Upgradable Loader: Initialize Buffer(0)
  if (!keys[instructions[1].programIdIndex].equals(BPF_LOADER_UPGRADABLE_LOADER)) return false;
  const bpfUpgradableLoaderInstructionCode = Buffer.from(base58.decode(instructions[1].data).slice(0, 4)).readUInt32LE(0);
  if (bpfUpgradableLoaderInstructionCode !== 0) return false;
  if (!keys[instructions[1].accounts[0]].equals(bufferAccountPubkey)) return false;
  
  return true;
}

function isWriteTransaction(tx: TransactionResponse, bufferAccountPubkey: PublicKey): boolean {
  const transaction = tx.transaction;
  const keys = transaction.message.accountKeys;
  const instructions = transaction.message.instructions.filter((tx) => !keys[tx.programIdIndex].equals(ComputeBudgetProgram.programId));

  if (instructions.length !== 1) return false;

  // BPF Upgradable Loader: Write(1)
  if (!keys[instructions[0].programIdIndex].equals(BPF_LOADER_UPGRADABLE_LOADER)) return false;
  const bpfUpgradableLoaderInstructionCode = Buffer.from(base58.decode(instructions[0].data).slice(0, 4)).readUInt32LE(0);
  if (bpfUpgradableLoaderInstructionCode !== 1) return false;
  if (!keys[instructions[0].accounts[0]].equals(bufferAccountPubkey)) return false;

  return true;
}

function isUpgradeTransaction(tx: TransactionResponse, bufferAccountPubkey?: PublicKey): boolean {
  const transaction = tx.transaction;
  const keys = transaction.message.accountKeys;
  const instructions = transaction.message.instructions.filter((tx) => !keys[tx.programIdIndex].equals(ComputeBudgetProgram.programId));

  if (instructions.length !== 1) return false;

  // BPF Upgradable Loader: Upgrade(3)
  if (!keys[instructions[0].programIdIndex].equals(BPF_LOADER_UPGRADABLE_LOADER)) return false;
  const bpfUpgradableLoaderInstructionCode = Buffer.from(base58.decode(instructions[0].data).slice(0, 4)).readUInt32LE(0);
  if (bpfUpgradableLoaderInstructionCode !== 3) return false;
  if (!!bufferAccountPubkey && !keys[instructions[0].accounts[2]].equals(bufferAccountPubkey)) return false;

  return true;
}

function isDeployWithMaxDataLenTransaction(tx: TransactionResponse, bufferAccountPubkey?: PublicKey): boolean {
  const transaction = tx.transaction;
  const keys = transaction.message.accountKeys;
  const instructions = transaction.message.instructions.filter((tx) => !keys[tx.programIdIndex].equals(ComputeBudgetProgram.programId));

  if (instructions.length !== 2) return false;

  // BPF Upgradable Loader: DeployWithMaxDataLen(2)
  if (!keys[instructions[1].programIdIndex].equals(BPF_LOADER_UPGRADABLE_LOADER)) return false;
  const bpfUpgradableLoaderInstructionCode = Buffer.from(base58.decode(instructions[1].data).slice(0, 4)).readUInt32LE(0);
  if (bpfUpgradableLoaderInstructionCode !== 2) return false;
  if (!!bufferAccountPubkey && !keys[instructions[1].accounts[3]].equals(bufferAccountPubkey)) return false;

  return true;
}

function isSetAuthorityTransaction(tx: TransactionResponse, bufferAccountPubkey: PublicKey): boolean {
  const transaction = tx.transaction;
  const keys = transaction.message.accountKeys;
  const instructions = transaction.message.instructions.filter((tx) => !keys[tx.programIdIndex].equals(ComputeBudgetProgram.programId));

  if (instructions.length !== 1) return false;

  // BPF Upgradable Loader: Set Authority(4)
  if (!keys[instructions[0].programIdIndex].equals(BPF_LOADER_UPGRADABLE_LOADER)) return false;
  const bpfUpgradableLoaderInstructionCode = Buffer.from(base58.decode(instructions[0].data).slice(0, 4)).readUInt32LE(0);
  if (bpfUpgradableLoaderInstructionCode !== 4) return false;
  if (!keys[instructions[0].accounts[0]].equals(bufferAccountPubkey)) return false;

  return true;
}

function getAllocatedDataSize(tx: TransactionResponse): number {
  const transaction = tx.transaction;
  const keys = transaction.message.accountKeys;
  const instructions = transaction.message.instructions.filter((tx) => !keys[tx.programIdIndex].equals(ComputeBudgetProgram.programId));

  const createAccountIx = SystemInstruction.decodeCreateAccount({
    programId: SystemProgram.programId,
    data: Buffer.from(base58.decode(instructions[0].data)),
    keys: instructions[0].accounts.map((i) => ({
      isSigner: transaction.message.isAccountSigner(i),
      isWritable: transaction.message.isAccountWritable(i),
      pubkey: keys[i],
    })),
  });

  return createAccountIx.space;
}

type WritePayload = {
  offset: number;
  bytes: Buffer;
};

function getWritePayload(tx: TransactionResponse): WritePayload {
  const transaction = tx.transaction;
  const keys = transaction.message.accountKeys;
  const instructions = transaction.message.instructions.filter((tx) => !keys[tx.programIdIndex].equals(ComputeBudgetProgram.programId));

  // instruction code: u32
  // offset: ui32
  // length: u64
  // bytes: [u8; length]
  const data = Buffer.from(base58.decode(instructions[0].data));

  const offset = data.readUInt32LE(4);
  const length = data.readBigUint64LE(8);
  const bytes = data.slice(16);
  invariant(length === BigInt(bytes.length), "length mismatch");
  
  return {offset, bytes};
}

function getBufferAccountFromUpgradeTransaction(tx: TransactionResponse): PublicKey {
  const transaction = tx.transaction;
  const keys = transaction.message.accountKeys;
  const instructions = transaction.message.instructions.filter((tx) => !keys[tx.programIdIndex].equals(ComputeBudgetProgram.programId));
  return keys[instructions[0].accounts[2]];
}

function getBufferAccountFromDeployWithMaxDataLenTransaction(tx: TransactionResponse): PublicKey {
  const transaction = tx.transaction;
  const keys = transaction.message.accountKeys;
  const instructions = transaction.message.instructions.filter((tx) => !keys[tx.programIdIndex].equals(ComputeBudgetProgram.programId));
  return keys[instructions[1].accounts[3]];
}
////////////////////////////////////////////////////////////////////////////////

const RPC_ENDPOINT_URL = process.env["RPC_ENDPOINT_URL"];

const TRANSACTION_HISTORY_LIMIT = 1000;
const MAX_TRANSACTION_HISTORY_FETCH_COUNT = 10; // max transaction number: 1000 * 10 = 10000
const TRANSACTION_FETCH_CHUNK_SIZE = 25 * 2;

//const INITIALIZE_BUFFER_SAMPLE = "4vzG5qUCqMQXXhKCSok4fjXnLctNQXzNtotVfN6EimpKyDbngAJHGnY1wEoKohjFqVcUHdVPNSD8TwEgcuiQrkSN";
//const WRITE_SAMPLE = "PNQxq8XSJWYxH19EqWc7HCjKdMYa8e26m8ZEAinWTuCCMcMt16yZau45zgZQ32LmWssJCMH5LkmyZaJwRApgQ1d";
//const SET_AUTHORITY_SAMPLE = "5fBS6zsWEzrjvA4xgReKzFdxjAG2LddQJeUsZkLDU9YDrzUyJ7EbJminmE1S1W2UmfWUnetYRJAWcwJZoCz3cbZ3";
//const UPGRADE_SAMPLE = "56A3UEVNNjuT4qtDVVWKXzBdSDYiygi4vUJtYmtLHErNxzoctgchmwR53g1Z392JTEPrLaNtQaudZJKjbH9yn2Qn";
//const DEPLOY_SAMPLE = "4QfHs7WnQfxHYHVSG2L3Bphju9FDKZBvr3Abie57XV2RPDEcbCLnCy8R63pCFcxdQyk7LAsbhT4WPtGj4AzFaWaH";

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL, "finalized");
  const config: GetVersionedTransactionConfig = {maxSupportedTransactionVersion: 0};

  const {upgradableProgramId} = await prompt.get(["upgradableProgramId"]);
  console.log("upgradableProgramId:", upgradableProgramId);
  const upgradableProgramPubkey = new PublicKey(upgradableProgramId);

  const isUpgradable = await isUpgradableProgramAccount(connection, upgradableProgramPubkey);
  invariant(isUpgradable, "not upgradable program account");

  const programDataAccountSize = await getUpgradableProgramDataAccountSize(connection, upgradableProgramPubkey);
  const soBinarySize = programDataAccountSize - PROGRAM_DATA_META_SIZE;
  console.log("programDataAccountSize:", programDataAccountSize);
  console.log("soBinarySize:", soBinarySize);

  const {deployOrUpgradeTransactionSignature} = await prompt.get(["deployOrUpgradeTransactionSignature"]);
  console.log("deployOrUpgradeTransactionSignature:", deployOrUpgradeTransactionSignature);

  const deployOrUpgradeTransaction = await connection.getTransaction(deployOrUpgradeTransactionSignature, config);
  let bufferAccountPubkey: PublicKey;
  if (isDeployWithMaxDataLenTransaction(deployOrUpgradeTransaction)) {
    bufferAccountPubkey = getBufferAccountFromDeployWithMaxDataLenTransaction(deployOrUpgradeTransaction);
  }
  else if (isUpgradeTransaction(deployOrUpgradeTransaction)) {
    bufferAccountPubkey = getBufferAccountFromUpgradeTransaction(deployOrUpgradeTransaction);
  } else {
    throw new Error("invalid transaction");
  }
  console.log("bufferAccountPubkey:", bufferAccountPubkey.toBase58());

  console.log("fetching transaction history...");
  const signatures: string[] = [];
  let allFetched = false;
  let before = undefined;
  for (let i = 0; i < MAX_TRANSACTION_HISTORY_FETCH_COUNT; i++) {
    const result = await connection.getSignaturesForAddress(bufferAccountPubkey, {
      limit: TRANSACTION_HISTORY_LIMIT,
      before,
    });
    before = result[result.length - 1].signature;
    signatures.push(...result.map((r) => r.signature));

    if (result.length < TRANSACTION_HISTORY_LIMIT) {
      allFetched = true;
      break;
    }
  }

  if (!allFetched) {
    console.log("transaction history fetch limit reached");
    return;
  }
  console.log("\tfound:", signatures.length, "transactions");

  signatures.reverse();

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const transactions: Map<string, TransactionResponse> = new Map();
  for (let i = 0; i < signatures.length; i += TRANSACTION_FETCH_CHUNK_SIZE) {
    const chunk = signatures.slice(i, i + TRANSACTION_FETCH_CHUNK_SIZE);
    console.log("\tfetching", i, "to", i + TRANSACTION_FETCH_CHUNK_SIZE - 1, "...");
    const txs = await connection.getTransactions(chunk, config);
    txs.forEach((tx) => transactions.set(tx.transaction.signatures[0], tx));
    await sleep(1000);
  }
  
  console.log("building program data...");

  let programDataSize: number;
  let writeSet: Map<number, WritePayload>;
  for (const signature of signatures) {
    const tx = transactions.get(signature)!;

    if (isInitializeBufferTransaction(tx, bufferAccountPubkey)) {
      programDataSize = getAllocatedDataSize(tx) - BUFFER_META_SIZE;
      writeSet = new Map();
      console.log("\tinitialize buffer", programDataSize);
    } else if (isWriteTransaction(tx, bufferAccountPubkey)) {
      const write = getWritePayload(tx);
      writeSet.set(write.offset, write);
      console.log("\twrite", write.offset, write.bytes.length);
    } else if (isUpgradeTransaction(tx, bufferAccountPubkey) || isDeployWithMaxDataLenTransaction(tx, bufferAccountPubkey)) {
      const upgrade = isUpgradeTransaction(tx, bufferAccountPubkey);
      console.log(upgrade ? "\tupgrade" : "\tdeploy with max data len");

      invariant(programDataSize <= soBinarySize, "program data size too large");

      const programData = Buffer.alloc(soBinarySize);
      const writes = Array.from(writeSet.values());
      writes.sort((a, b) => a.offset - b.offset);
      let end = 0;
      for (const write of writes) {
        invariant(write.offset === end, "write offset mismatch");
        end += write.bytes.length;
        programData.set(write.bytes, write.offset);
      }
      invariant(end === programDataSize, "program data size mismatch");

      fs.writeFileSync(`${deployOrUpgradeTransactionSignature}.so`, programData);
    }  else if (isSetAuthorityTransaction(tx, bufferAccountPubkey)) {
      // nop
      console.log("\tset authority");
    }
    else {
      // initialize buffer uses much SOL, so scammers may send tiny SOL to the buffer account
      console.log("ignore unknown transaction", signature);
    }
  }
}

main();
