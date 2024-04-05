import { Connection, Finality, VersionedTransactionResponse } from "@solana/web3.js";
import { ORCA_WHIRLPOOL_PROGRAM_ID } from "@orca-so/whirlpools-sdk";
import { AddressUtil } from "@orca-so/common-sdk";
import base58 from "bs58";

// decoder
import { WhirlpoolTransactionDecoder, TransactionJSON } from "@yugure-orca/whirlpool-tx-decoder";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface BlockTrackerCallback { (slot: number): Promise<void>; };

class BlockTracker {
  private connection: Connection;
  private commitment: Finality;
  private callback: BlockTrackerCallback;

  private stop: boolean;
  private lastAppendedSlot: number;
  private queuedSlots: number[];

  constructor(connection: Connection, commitment: Finality, callback: BlockTrackerCallback) {
    this.connection = connection;
    this.commitment = commitment;
    this.callback = callback;
  }

  public async startTracking() {
    this.queuedSlots = [];
    this.lastAppendedSlot = await this.connection.getSlot(this.commitment);
    this.stop = false;
    this.runFetchSlotLoop();
    this.runProcessSlotLoop();
  }

  public async stopTracking() {
    this.stop = true;
  }

  private async runFetchSlotLoop() {
    while (!this.stop) {
      await sleep(1000);

      if (this.queuedSlots.length > 500) continue;

      try {
        // getBlocksWithLimit is better, but Connection class doesn't provide it
        const slots = await this.connection.getBlocks(
          this.lastAppendedSlot,
          this.lastAppendedSlot + 10000, // assuming that there are no gap over 10000 slots
          this.commitment,
        );

        // no new slot
        if (slots.length <= 1) continue;

        // new slots (cut off over 1000)
        const newSlots = slots.slice(1, 1 + 1000);

        this.queuedSlots.push(...newSlots);
        this.lastAppendedSlot = newSlots[newSlots.length - 1];

        console.log("new slots found:", newSlots);
      }
      catch {
        console.error("failed to fetch slots");
      }
    }
  }

  private async runProcessSlotLoop() {
    while (!this.stop) {
      if (this.queuedSlots.length === 0) {
        await sleep(1000);
        continue;
      }

      const slot = this.queuedSlots.shift()!;
      console.log("process slot:", slot);
      try {
        await this.callback(slot);
      } catch {
        // if you do not drop any slot data, you must not ignore this error here
        // this script is just a sample, so it's okay to ignore...
        console.error(`failed to process slot: ${slot}`);
      }
    }
  }
}

async function main() {
  //
  // ATTENTION
  //
  // 0) THIS SCRIPT WILL PROCESS BLOCKS SEQUENTIALLY.
  //    getBlock is a bit slot, so this script CANNOT catch up with the latest block.
  //    some parallel processing is required to catch up with the latest block.
  //
  // 1) this script will call the following RPC APIs:
  //
  //    - 1 getBlocks RPC call per second
  //    - 1 getBlock RPC call per confirmed block
  //
  //    Please be careful not to use much RPC credits without intention.
  //
  // 2) This script does not emphasize error handling.
  //
  //    Please add error handling according to your use.
  //
  // 3) more sophisticated implementation with BullMQ / redis / MySQL to persist Whirlpool instructions:
  //
  //    https://github.com/everlastingsong/sedimentology/tree/main/src/worker
  //
  const RPC_ENDPOINT_URL = process.env["RPC_ENDPOINT_URL"] || "";
  const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");

  const bigintPatch = (_key: any, value: any) => (typeof value === "bigint" ? value.toString() : value);

  const blockTracker = new BlockTracker(connection, "confirmed", async (slot: number) => {
    // fetch block
    const block = await connection.getBlock(slot, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
      transactionDetails: "full",
      rewards: false,
    });

    console.log(`\t${block!.transactions.length} transactions found at slot ${slot}`);
    block!.transactions.forEach((tx) => {
      // ignore failed transaction
      if (tx.meta!.err) return;

      // decode
      const ixs = WhirlpoolTransactionDecoder.decode(convertToTransactionJSON({slot, ...tx}), ORCA_WHIRLPOOL_PROGRAM_ID.toBase58());

      // ignore transaction without whirlpool instructions
      if (ixs.length === 0) return;

      // print
      console.log(`\t${ixs.length} whirlpool instructions found at ${tx.transaction.signatures[0]}`);

      // too many output
      /*
      ixs.forEach((ix, index) => {
        console.log(`instruction[${index}]: ${JSON.stringify(ix, bigintPatch, 2)}`);
      });
      */      
    });
  });

  console.log("start tracking...");
  await blockTracker.startTracking();

  // sleep...
  const processSec = 20;
  await sleep(processSec * 1000);

  console.log("stop tracking...");
  await blockTracker.stopTracking();
}

function convertToTransactionJSON(tx: VersionedTransactionResponse): TransactionJSON {
  const loadedAddresses = !tx.meta!.loadedAddresses ? undefined : {
    writable: AddressUtil.toStrings(tx.meta!.loadedAddresses.writable),
    readonly: AddressUtil.toStrings(tx.meta!.loadedAddresses.readonly),
  };

  return {
    result: {
      meta: {
        innerInstructions: tx.meta!.innerInstructions ?? [],
        loadedAddresses, // keys from ALT
      },
      transaction: {
        message: {
          accountKeys: AddressUtil.toStrings(tx.transaction.message.staticAccountKeys), // static keys
          instructions: tx!.transaction.message.compiledInstructions.map((ix) => ({
            programIdIndex: ix.programIdIndex,
            accounts: ix.accountKeyIndexes,
            data: base58.encode(ix.data), // data should be base58 string
          })),
        },
        signatures: tx.transaction.signatures,
      }
    }
  };
}

main();

/*

$ ts-node src/84e_parse_whirlpool_tx_with_decoder_with_block_stream.ts 
start tracking...
new slots found: [ 258410176, 258410177, 258410178 ]
process slot: 258410176
new slots found: [ 258410179, 258410180, 258410181, 258410182, 258410183 ]
        2072 transactions found at slot 258410176
        3 whirlpool instructions found at 3fisgU7T7iY3FujNEUDM8J9oYqbyC6DConSgWH9LTNaba1hnNXEt3Fsz6sm4j2ex3zzyrme9rrvAmhmfqA4FLuSM
        1 whirlpool instructions found at TagfGv5BXEwtNw5BmLzANdsLyBng5f3AcRXpE6TXdFbLD523GcAghcd9KDJQTYHbYxRQi6xD3c3JCybtuEAHcG4
        2 whirlpool instructions found at 3RdBpbBCDSTznRfo3f12FUyW2jh4oAfohy129HMSnfw1FM5EK3PgxMvjQFq7erAVopDwx7c8iB9zgYLteEeuaKn6
        1 whirlpool instructions found at 2kTXa6egM4T3mfzuf3xKGbaM6j98fDahns69qpv1ZgKohtMSK592BudDHQsaBBrQRgXrs18aYg6E5nqTGaCe76Zu
process slot: 258410177
new slots found: [ 258410184, 258410185, 258410186, 258410187, 258410188 ]
        880 transactions found at slot 258410177
        1 whirlpool instructions found at 4oDbQQW8J2joTwX2apRadg6Kww2YRRkqLeofWEDyM2G7Fcn5yUcCkdPHKjRbbZLuHzGXJYVUcczGg9V9upbdNwNk
        1 whirlpool instructions found at 2nCXvekoX6oxJwqLNSwyQY2Yz5bF174cqsSvRgkAX6YY8dVcZaF92TPViEQS7qZKLT65xPUWxiLhCZmZzFKxzfqq
        2 whirlpool instructions found at 33G6oGoiM5wCsCzGzvTdNfstPvjLJH1MtfgxXxZ2usCTcUzCvyhbgqyvEwXoWJyFmEyXFHTLvqYZjU2Yhb6D5qnW
        1 whirlpool instructions found at 4TW8KQuxpfyfpZKk6m5xwxoHwjr4Aw8xHmmSTqQgyAn2gHe4XZCMwHWqyB2Pk5eP21vofvYdtrRdFCAfgBys3Tkq
process slot: 258410178
new slots found: [ 258410189, 258410190, 258410191 ]
        757 transactions found at slot 258410178
        1 whirlpool instructions found at 2d5Z7e7XdEvqY6DWHm5WoF5b9oYGDt87MTYyz2THHbDnYGAw6JinW3ZCTLjWPuJK7h9tKYB2tU9bkjVJ2ke9SeTj
        2 whirlpool instructions found at 3skvfhnWLP3KWLppyE58hKNckvzLJ6jE71t5DjyGZpbT794wLpWWQsXujrKaHEMQdhKEWeZTaVcoXX8g58SsHeDR
process slot: 258410179
        843 transactions found at slot 258410179
        1 whirlpool instructions found at 5ehTCHt4jYrgt2oJZmsJnDMaEGGsj4KkmDtAPfzLePJU94qa5YjEWR4tXJbm1SjHoKSGXSMBmTbSyAcA4s5q1XQZ
        1 whirlpool instructions found at 4L3z1Zc7Vy5QnvHSx9r799yXQHr6vZWnXsrb5BKYT3QDybeV1B2nSXyRE8KCLf1fX4w86UEMh7JG93eafRobuE21
process slot: 258410180
new slots found: [ 258410192, 258410193, 258410194, 258410195 ]
        2024 transactions found at slot 258410180
        1 whirlpool instructions found at 5dnzFg4RqG2n5Vx5PZ57twW1PMzvqrfmdcQLX8xjLaHS31mrNH2hnHgLArhhph7ecrAfiSTLxejcQLxoLKCVeKAL
        3 whirlpool instructions found at 5Xm17knkSKWc4rz9dA6zVDm7YMmVqzEsQ7pMyMyHTehbnGPp8NAAJD913GojPeW32Eb7E9FiYUFPhH22ctwgM7H3
process slot: 258410181
        1666 transactions found at slot 258410181
        2 whirlpool instructions found at 3Se7PTcZBUfTuKtvFY1X8hDzHn1bTpax4PpbQpThiv1fvFy36iHmHspL1FZo1VJZp9E9mKDC7oCKZQESPXrYEeWi
        1 whirlpool instructions found at 3eCdN1wcPicDVm9EujemvLJ9navH41SjMA4uxC8XxNSLSxYU3T3rLrpZVS9XWuqBDLjYSdEFqRBFJZX3RQTKUQq
        1 whirlpool instructions found at V5JHhjWE8MPALdsg48LwHMpUMTHSJwqMjuFQw3GKmk7qCqNQth116K4iWgiJWNeowRYm3FURwECpo4sTrCdeTKd
process slot: 258410182
        1813 transactions found at slot 258410182
        1 whirlpool instructions found at 5a5JySQoYc8yexSVBGDkjF7JSJGtu9JzKsoetEfqjPvok8Y4YaqctRSfMtiZdqtN21WPy32HtXBYAN4wLWDZt1ye
        1 whirlpool instructions found at 21UfayqfBYKuZYTp79peVWh7VnbfsXUsrCZzzmAZDZZaaQ5pawK1iNF2WgcnPKradZTsQnWNNS96KLPyPehJKyPB
        1 whirlpool instructions found at 2QYGosLQ5ZWXCre3VpnyhVah9RhyjizRDsSHoUSETvxk1pJxtHYLRu7RNBuoyDkTcczeYJYDo6MTfcNKLSsa9aA8
        1 whirlpool instructions found at JjJw7CBoQSY73TJueGMJ1vkEfLyCb162m762VsCPVnZ1dqEKzYdmCzezUf15LyFpeZAnWbU9R8rhXhAit6RyZyy
process slot: 258410183
new slots found: [ 258410204, 258410205, 258410206, 258410207 ]
        890 transactions found at slot 258410183
        1 whirlpool instructions found at 58Y4GiRV5XXkHK8rcLwCTduMFh1vHMAVn6zANhXrnJxH7SxmGy1EfvcyLxu9K4TzqxLUhZdxUGU1hUTpQ2GN62fD
        2 whirlpool instructions found at 3MZ7yqGcm4QYfATWnv9mpsr6H958ZqoE6m7YHNEpbYk2wqXNqGC8sbknu749zhZfXCCgRC6LbowV2dbLq5y7Bmbq
        1 whirlpool instructions found at 5e6dFHU2bPwdvktKNXbyJqz9W9T4Jkfx7t7AoRU9HmvCrfzTa8FnskzmYdFPH1nu8x7HNmhjEJuNxFyTQWeoiEzY
        1 whirlpool instructions found at Gt92WUUar2eh5fAMXwYVBBey4L96pnvns16vEcE6k1kGuVU7y5cw25wiEhKctSozyU2GKsCk9XMAnCKhAc4Hshg
        2 whirlpool instructions found at 4KrsQuwa9tv4c38y5LmHVv2M71Mzyq2Puy1BGvKZaKZSUkEG9VPYF3RiE6b3sga7CjgXw1bPcQbRc3xNdC69DJZb
        1 whirlpool instructions found at 5qNjAV2WaYz9cc3EEY1JPo7JnJ5VH8rGAUocdyQmMNd6j3P4Bht1W13dqqYQY7bBiKHeGo5Fiaag5KdYdAuWG6Bd
        3 whirlpool instructions found at 2k18PDRRGPBToxNDK6wViF4qGBFvYnaHHUt6nAdH9dUnP5UwSEgiFVCANCVLrPSB9ggg2hb3BGpteqMLakkR93Sr
        1 whirlpool instructions found at 5Fts8Qv35DtmLBbaSjxvWPcGtRbmLnAhZGA91tY74RBKt2wFtDUsDgoCjVaPg4ikXFzBwiE5gU1KPSM57D1Q1Zce
        1 whirlpool instructions found at T9VwmB7kBbqma3DAezHmWSya7DXADvePNs3rfayxHSS4xNSXUa1LQe9aV28BvmtBJcUoovDmN1jqsvhpirNHJo2
process slot: 258410184
        1519 transactions found at slot 258410184
        1 whirlpool instructions found at 24UhNhGLMgvKsaVTecaXKVHq4t89z46XSo76gAC8ugtziyhoACQVspe8x7X6kAGoJq2gvuRStWhaE9G4xGgiefMn
        1 whirlpool instructions found at 2Nuey5UPMuZYSENTqgzTRd7bjEMZ5BGpf1c64WfMJHjMpUVVcpHkryQSsTFEMf3vmWgYWhAYu3WN7nLgX7d9cinU
        1 whirlpool instructions found at 4bcd8o6ogRxEb7RW4pxu1UkunWq5iADUjgrMf6NE6RZn5FMzyQMFPWyYF2yCTJPFmKLhysXNtHhT9pNX2kqGHNBT
        1 whirlpool instructions found at SXP5uzJjVRUgzFpxZaCyqd4Y9Wy8kTLVXLYAa95euDrvGro31Fs9XgykuBSyZLu1xda2Z21qHrJv29w8iM1LjgR
        2 whirlpool instructions found at 4smB5TfCy7oSt51qJDHXEyYzffp7onEHquDV4F62viCBgjCGtH7BYsnAMCwwLWRQLS16NqUPNZofv7jqfXcjmxwn
process slot: 258410185
new slots found: [ 258410208, 258410209 ]
        1782 transactions found at slot 258410185
        1 whirlpool instructions found at 4iSNQSU4zuuHD3qETB8qnV3TGXw3Ro53B1y1ki3sC5vQdquEt2jWcxg3goyFDFAUHq8aPEzBL57ZvuCwsLkxuBwo
        1 whirlpool instructions found at 4Rte96dzy5nqJGrKwrcedVZMDzhKmmkPByzHADwxmX3YuJXrRRgNng7c5bLZf39P3LZXh3g8ja29fXWuxzXzyFdY
        1 whirlpool instructions found at 2uxpe9HCmK7iCdPR5zrX5krbs3B7bkrmQjt5Qhgf4ZxnD1ad9xmszfXMHpkvvNUDgXScGySfB1BLLn8jhBccrBeA
        1 whirlpool instructions found at 5toSKoNtNjHXU7pnAbN6rA2W7pvuzjFQZKNsQctUk2kDvb5MxFJ1h2MvkSDAW1s5xM9JXHwScWPRcnfBu5ekBJKw
        1 whirlpool instructions found at 5zmocp7ZxVMqN6nGLfcg7Gs8KQcyG7K6Arjzkwd46sSN27UVtzqDMK6sZ78fu7nR9Nop4YueqD24DD7iJ5ju6LaL
        3 whirlpool instructions found at 96fS7KYkAyEfbSbS5CtxwYKKYip7yejqt7MGXcrzYAjroJMfJ2wRp8Xxp8VwmjTGcWDwPLLCZVCYJKHvnF9PfZ7
process slot: 258410186
new slots found: [ 258410210, 258410211, 258410212 ]
        1994 transactions found at slot 258410186
        1 whirlpool instructions found at 5LtdxT1fJjuBADp4GaQ1CMoamh1GXsvfYXJS1KQLMbazo7j5mJ4JqX1qqSp7AXRRC1vhXXRzbagbaFD1SXXKgvox
process slot: 258410187
new slots found: [ 258410213, 258410214, 258410215 ]
        836 transactions found at slot 258410187
        1 whirlpool instructions found at 4HePAnAeVngNquv7NAptFoBupTMDHJLPeMD1BQvKeXdpqJJ3hHAQQcyGkHNmmTY6jSPRwiWt6WCR25Gdu8sagDKT
        1 whirlpool instructions found at 32XRVVdzLGBjNeVWMyAxLo8JY6WYc1zj2tpC91iubVhVfhiAiTKcJN5vFXsGe7BCXpvWvp5WVo17KtFSJpfnkVjJ
        1 whirlpool instructions found at 5kTGBvLVReRnfGgC1ZGC4spQ1Dt3GSwqZLAbngAMLmwoqUj6CB9FWt4EjfwcFcE9mFjpPsPsaJFBS1sqA4pzsefs
        2 whirlpool instructions found at 23ngAYsjCaXGMmMQi5TD1J5oBbcDmW3pWG24fxV2QM4skAvnLp5AGeTyz6RP3dBRdSi7sV2LzFKU5YBVQC6Pp5iJ
        1 whirlpool instructions found at 2g6SDpJxRTb23trbJheTq3pQX4dxgmkUy4B8GKhrCe86VfN6C4Zt72EJ8TeuNnrJPRsvsxsR8d9scWXqGgmVogbd
        1 whirlpool instructions found at 66WTNgc8m1o2nT1GcQRCFMWJjXNAuT3Fp4LA8h1LDw6q9VjLNTpeNnkdbQtZDtBr7h8ETLvXS4UobAwZEUr327mE
process slot: 258410188
        1670 transactions found at slot 258410188
        1 whirlpool instructions found at 267YVChAGnrybfxzJc2rrePhj7xKWta4x9WEec1sFQx9pCKKnuchA9W9xxoHtYxpT7Z3wjbi5SmaTt6gw6BrRu76
        1 whirlpool instructions found at 2psPMdZrLW9ww7SvCu2p7keL2dq7FEf3Vz6Hjwh2RYUQQzA6VfXiDYEsk27fvSTpVAHU9JYZzxQZVVqLJQD2tELW
        1 whirlpool instructions found at cfnBSuL3sSSpYk9tsJxCyMk1mvCDoJE14B57DKP96CEnyZNyMsLeatgyQ5YbHTR8LszDT7ihg1VjjPqwfPiKzwi
        1 whirlpool instructions found at 46sATGAKBinGc4zyS2xG9QbM5GkR5rFsJ5Cg59BrzKP8QimHtKmpCcTewbhyqeomhV8WdTNYpNUJWkrBBkkTXcvk
        1 whirlpool instructions found at 2KkddWfbj9tGW4McUSXdNv6L7Xbn8kkb7e8BraXsX5La2pTGcjUVgYV9SRiWgNhq8L4H6AsYkDDca3SWu43ZjQ6K
        2 whirlpool instructions found at 64d6o2zhRen53drpSVX6XL3Dgye33CXXHhdNy6S1FyJRVgRkm5NhAk94DTsSRXkkzSadX446CjfqqQ54HTQitwzQ
process slot: 258410189
new slots found: [ 258410216, 258410217, 258410218 ]
        1580 transactions found at slot 258410189
        4 whirlpool instructions found at 3zAZAsXFFz6LHMCj2Hcxar8gJpZV5TrTheSCwEpUbDnufyF5WCwk6Ua2FaPjyHb3zothyPFVYT5c3bDtcJ14G5rK
        1 whirlpool instructions found at 41ww65Jp8HbEnAB9Kypd45g7g6sDENrAVprym4mBrht1VfFHzXSAWzrrMUxuNvRrUdQtKwyEYiANGrgr8A7YdPuS
        1 whirlpool instructions found at M1L1Hu1zJARavzb3KxhRF7Dm3DupzMdZYTJSwhGdztVvKA9q5b5SqNoVYGazVCeCRYpR8PWEeBU66jAu8fMr8je
        1 whirlpool instructions found at 3kqCdZei33v2SgPXSWbrHZ7iFcBu1CRupLJNjGcZE9qcUxJLt2N94KW7CZZHfqNoT7ssHSpm3t8dRRGjYABYLvCi
        1 whirlpool instructions found at jbic44dRX5jmkJJoCmQurmiZGY7XA8t6JSm96CTTnuo3VQg9BDr4rp8pzreXFKjCMGxuoXmKMPJamiwYi3JHRch
        1 whirlpool instructions found at 2xraPkoGax9JLrHkhL3tkC64nfG5guauEb2K4k6e16cgF2qjNiZ86UA55P5ERVhQWD7UWXTSg7hZxiothms9QLuv
        1 whirlpool instructions found at ZeE5EHZWUNWdAmftMcnuvFR8CDx8uL4h1atjMgVQZ77dxRa2EiSJSoj9MLT9epQdCARcGahwciY4cGNwvPFQpzE
process slot: 258410190
stop tracking...
new slots found: [ 258410219, 258410220, 258410221, 258410222 ]
        1030 transactions found at slot 258410190
        1 whirlpool instructions found at 55AMw4GtJmXLLPEwHkJ4c9uAFBcmtLiXZEAb5j3b6XQGjhNxUhgiChBm4hXkQaT1kro7HSaUt974x6w4Sjkw34cb
        1 whirlpool instructions found at 67kNavQvckymvaXNz5baByDVWpB2s2iNWPQm2W9QDQ3SqbeQxMbCbwPiGaczSH9sxN5pbLqijbUD3RsYJ5UCyfg9
        1 whirlpool instructions found at 41FFVSGUn6AwKKW4hyVdf1g6y6nmAjJ2Pyfq5tBeM8UcGoysaAK3Vo6ugWa5BX9WuKpUc5AdhjwFZwbVyncU5wzH
        1 whirlpool instructions found at 3zV7FC1wCRmsySJC6maeR16XmaCPv352zHTeE4BKLSe1Y84GPcV6sW9wheru2exbiMKuBX8WMTbKit4aweHHHLez
        1 whirlpool instructions found at 5C2FTHdSZnctGv5R7HHrvkYZqPJrHK8bYyxSARLLtrDZzdzxo2g1uyozZu6mVHz3Z9TPnZod2B7bGjBmJnYfnerp

*/
