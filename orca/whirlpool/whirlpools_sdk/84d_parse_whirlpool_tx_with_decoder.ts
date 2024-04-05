import { Connection, VersionedTransactionResponse } from "@solana/web3.js";
import { ORCA_WHIRLPOOL_PROGRAM_ID } from "@orca-so/whirlpools-sdk";
import { AddressUtil } from "@orca-so/common-sdk";
import base58 from "bs58";
import * as prompt from "prompt";

// decoder
import { WhirlpoolTransactionDecoder, TransactionJSON } from "@yugure-orca/whirlpool-tx-decoder";

async function main() {
  const RPC_ENDPOINT_URL = process.env["RPC_ENDPOINT_URL"] || "";
  const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");

  // prompt
  const {signature} = await prompt.get(["signature"]);
  console.log("signature:", signature);

  // get transaction
  const tx = await connection.getTransaction(signature, {commitment: "confirmed", maxSupportedTransactionVersion: 0});

  // decode
  const ixs = WhirlpoolTransactionDecoder.decode(convertToTransactionJSON(tx!), ORCA_WHIRLPOOL_PROGRAM_ID.toBase58());

  // print
  const bigintPatch = (_key: any, value: any) => (typeof value === "bigint" ? value.toString() : value);

  console.log(`${ixs.length} whirlpool instructions found`);
  ixs.forEach((ix, index) => {
    console.log(`instruction[${index}]: ${JSON.stringify(ix, bigintPatch, 2)}`);
  });
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

TRANSACTION SAMPLE: https://solscan.io/tx/4GkwofR2chnGBo56EFnsT78s1XKYGHNF8EHT1nRMMTkBGvVZ7LQhstH736w8SekoNDcv2Bywj5gczqjMvtnZHGTd

$ ts-node src/84d_parse_whirlpool_tx_with_decoder.ts 
prompt: signature:  4GkwofR2chnGBo56EFnsT78s1XKYGHNF8EHT1nRMMTkBGvVZ7LQhstH736w8SekoNDcv2Bywj5gczqjMvtnZHGTd
signature: 4GkwofR2chnGBo56EFnsT78s1XKYGHNF8EHT1nRMMTkBGvVZ7LQhstH736w8SekoNDcv2Bywj5gczqjMvtnZHGTd
3 whirlpool instructions found
instruction[0]: {
  "name": "swap",
  "data": {
    "amount": "7138fd3977",
    "otherAmountThreshold": "0272ce6b12",
    "sqrtPriceLimit": "0100013b50",
    "amountSpecifiedIsInput": true,
    "aToB": true
  },
  "accounts": {
    "tokenProgram": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "tokenAuthority": "J5hS1vou3Dbfj6dh55RNhVVhh2NkfqNhkVt88KmSWPn9",
    "whirlpool": "G2FiE1yn9N9ZJx5e1E2LxxMnHvb1H3hCuHLPfKJ98smA",
    "tokenOwnerAccountA": "8y61Y1RqPKg2NCEjTASnRevCR9Hy8maxvXJuqDVnHPPM",
    "tokenVaultA": "7fku98xvSRXusRHWUh7vEvRRjCq2akzBinipKsQPXg9u",
    "tokenOwnerAccountB": "Bns5rpjcei9reAzJDKYrvUebHq6Tk7zrDAwooDt7m9WU",
    "tokenVaultB": "AVZgewZzC8AQRCeXJTSnzQof25Y4R77tma59Htp5w245",
    "tickArray0": "8d9HiVmZB9sri9tuarqtm6UfyvRcErtD3ncX1k3dD2MV",
    "tickArray1": "FfsXtjUBYoRe1EeuhZSKTQrvL4tfCth33Qju8Un8WyTB",
    "tickArray2": "2R2ar1yv2qbdj231jMsD61SGG2TxUZuX9FtYajy5eW27",
    "oracle": "GemRExhV3akwqpCSY5qZiWCYW6HPYk3peNnYnNLf2gzZ"
  },
  "transfers": [
    "486287423863",
    "10517245655"
  ]
}
instruction[1]: {
  "name": "swap",
  "data": {
    "amount": "0272e06ed7",
    "otherAmountThreshold": "02b19b5f65",
    "sqrtPriceLimit": "fffec4b135bb7f32a81b33af",
    "amountSpecifiedIsInput": true,
    "aToB": false
  },
  "accounts": {
    "tokenProgram": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "tokenAuthority": "J5hS1vou3Dbfj6dh55RNhVVhh2NkfqNhkVt88KmSWPn9",
    "whirlpool": "Hp53XEtt4S8SvPCXarsLSdGfZBuUr5mMmZmX2DRNXQKp",
    "tokenOwnerAccountA": "GiYXXY18m4EWxuLM7u67uFVsiFsvsCGxUYu9UWJJZHxE",
    "tokenVaultA": "F7tcS67EfP4bBJhWLxCk6ZmPVcsmPnJvPLQcDw5eeR67",
    "tokenOwnerAccountB": "Bns5rpjcei9reAzJDKYrvUebHq6Tk7zrDAwooDt7m9WU",
    "tokenVaultB": "8tfJVFdcogGMmvW1RA1kDZey2BjwdCznF3MD4Pcxi9xn",
    "tickArray0": "3A3xa2M5oqcc7DqoHFQsu1wtF333ntbxmnEiPmUKKWTW",
    "tickArray1": "BHis2FrPbDvo9rAqytnQLZvH2Pbeb8r9znipdQKkC9o8",
    "tickArray2": "7btBrG9gQC5BKLaHLvdhL4DVCXYtppVD4EeQeGGdWWEU",
    "oracle": "HtKTsc1mu3PaLo89AZBaHtxooUfdvxEvBbo2YT99k45Z"
  },
  "transfers": [
    "10517245655",
    "11570983225"
  ]
}
instruction[2]: {
  "name": "swap",
  "data": {
    "amount": "02b1af3139",
    "otherAmountThreshold": "7db075af",
    "sqrtPriceLimit": "0100013b50",
    "amountSpecifiedIsInput": true,
    "aToB": true
  },
  "accounts": {
    "tokenProgram": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "tokenAuthority": "J5hS1vou3Dbfj6dh55RNhVVhh2NkfqNhkVt88KmSWPn9",
    "whirlpool": "FwewVm8u6tFPGewAyHmWAqad9hmF7mvqxK4mJ7iNqqGC",
    "tokenOwnerAccountA": "GiYXXY18m4EWxuLM7u67uFVsiFsvsCGxUYu9UWJJZHxE",
    "tokenVaultA": "BFAWVmF5aoALggQ9Y2RpTijpYKRESxcdNe6JDNZEpoxC",
    "tokenOwnerAccountB": "293hGf8UPjmCZcePgjUyismQ6hWg2t8anXWLTguDQusa",
    "tokenVaultB": "B1qD7GDsKN4kz2ehks71eEpVhUzqaTVXaWfCxXykRAA9",
    "tickArray0": "HhD8787h2mySukuURcERyYoS9QEUYzB6sUpL76e4dHBk",
    "tickArray1": "ABxuF2H8ogkZa1ZNjNai4Qi9fxUnBrBC9oxze2ar6Dou",
    "tickArray2": "6uRDUvo2Uzgv5PE5Dgmf1YxbZsUW3qWnZULYqyu2pyb3",
    "oracle": "C9fdYbm6pohfBWHh9bfkdyum3PCPgNmpUpyMrxXpVN6m"
  },
  "transfers": [
    "11570983225",
    "2108953204"
  ]
}

TRANSACTION SAMPLE: https://solscan.io/tx/49nxq6caxnbAp6KCDHZyBgXfK4nMsRXuh9ymvMFKWQMi8ZPTgukdZRprRAPdtMWHdNLW5GUx6QRRExs5DiSXTbR7

$ ts-node src/84d_parse_whirlpool_tx_with_decoder.ts 
prompt: signature:  49nxq6caxnbAp6KCDHZyBgXfK4nMsRXuh9ymvMFKWQMi8ZPTgukdZRprRAPdtMWHdNLW5GUx6QRRExs5DiSXTbR7
signature: 49nxq6caxnbAp6KCDHZyBgXfK4nMsRXuh9ymvMFKWQMi8ZPTgukdZRprRAPdtMWHdNLW5GUx6QRRExs5DiSXTbR7
1 whirlpool instructions found
instruction[0]: {
  "name": "swap",
  "data": {
    "amount": "01bb5ad668",
    "otherAmountThreshold": "00",
    "sqrtPriceLimit": "0100013b50",
    "amountSpecifiedIsInput": true,
    "aToB": true
  },
  "accounts": {
    "tokenProgram": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "tokenAuthority": "Dikdiks48wJfSfHG68e2LQ3ojLXQXGqS7DALXe9XzyGN",
    "whirlpool": "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE",
    "tokenOwnerAccountA": "DF2ekvcuhRnBirSJWLK8NeVg3x4B5DtgJD4WzSegLmTV",
    "tokenVaultA": "EUuUbDcafPrmVTD5M6qoJAoyyNbihBhugADAxRMn5he9",
    "tokenOwnerAccountB": "14XKiiMa1GzAsE4ZV87jDFjQoH8sCi4F8mua7hjJV8Nu",
    "tokenVaultB": "2WLWEuKDgkDUccTpbwYp1GToYktiSB1cXvreHUwiSUVP",
    "tickArray0": "63vsBPDtySAoA1tEdaevWJbDYCQ3UNPRa1Lkf93WPZc6",
    "tickArray1": "63vsBPDtySAoA1tEdaevWJbDYCQ3UNPRa1Lkf93WPZc6",
    "tickArray2": "63vsBPDtySAoA1tEdaevWJbDYCQ3UNPRa1Lkf93WPZc6",
    "oracle": "FoKYKtRpD25TKzBMndysKpgPqbj8AdLXjfpYHXn9PGTX"
  },
  "transfers": [
    "7438259816",
    "1365173027"
  ]
}

*/
