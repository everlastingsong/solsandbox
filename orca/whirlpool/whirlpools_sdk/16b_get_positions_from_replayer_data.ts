// for whirlpools-sdk v0.11.x

import { PublicKey } from "@solana/web3.js";
import {
    PositionData,
    ParsablePosition
} from "@orca-so/whirlpools-sdk";

// to handle large gzipped JSON file, we need stream processing
// https://www.npmjs.com/package/stream-json
import { Readable } from "stream";
import { chain } from "stream-chain";
import { parser } from "stream-json";
import { pick } from "stream-json/filters/Pick";
import { streamArray } from "stream-json/streamers/StreamArray";
import zlib from "zlib";
import fs from "fs";

// https://github.com/orca-so/whirlpool-tx-replayer?tab=readme-ov-file#public-remote-storage-endpoint
const WHIRLPOOL_REPLAYER_PUBLIC_REMOTE_STORAGE_ENDPOINT = "https://whirlpool-archive.pleiades.dev/alpha";

const BASE64_ENCODED_POSITION_ACCOUNT_DATA_PREFIX = "qryP5HpA"; // Encoded First 6 bytes of DISCRIMINATOR

async function downloadWhirlpoolStateJsonFile(yyyymmdd: string): Promise<Buffer> {
    const yyyy = yyyymmdd.slice(0, 4);
    const mmdd = yyyymmdd.slice(4, 8);
    const uri = `${WHIRLPOOL_REPLAYER_PUBLIC_REMOTE_STORAGE_ENDPOINT}/${yyyy}/${mmdd}/whirlpool-state-${yyyymmdd}.json.gz`;

    // my node version is v18.17... so I can use fetch function :-)
    const response = await fetch(uri);
    return Buffer.from(await response.arrayBuffer());
}

async function main() {
    const targetDate = "20240316"; // Mar 16, 2024 (Solana's 4th birthday)

    // please use local cache if you need to execute multiple times (to save outbound transfer)
    // wget https://whirlpool-archive.pleiades.dev/alpha/2024/0316/whirlpool-state-20240316.json.gz

    // const gzippedJsonBuffer = fs.readFileSync("whirlpool-state-20240316.json.gz");

    // download account snapshot at the end of targetDate
    const gzippedJsonBuffer = await downloadWhirlpoolStateJsonFile(targetDate);

    /*  FORMAT of whirlpool-state-yyyymmdd.json
     *
     *  {
     *      "slot": 254617822,
     *      "blockHeight": 235140933,
     *      "blockTime": 1710633599,
     *      "accounts": [
     *          {
     *              "pubkey": "11Uh2JSf1Cxcrp2JJHeF3vdmMz1fZAYT9ABsC1g6eTL",
     *              "data": "qryP5HpA99A8JXSdmhxMrZiE+sLL90CYyWTkYn..."
     *          },
     *          ...
     *      ],
     *      "programData": "f0VMRgIBAQAAAAAAAAAAAAMA9wABAAAAaH8KAAAAAABAAAAAAAAAAOAiDwAAAA..."
     *  }
     * 
     */
    const readStream = Readable.from(gzippedJsonBuffer);
    const pipeline = chain([
        readStream,
        zlib.createGunzip(),
        parser(),
        pick({filter: 'accounts'}), // pick accounts field
        streamArray(), // iterate each item
        ({value}) => value,
    ]);

    // data handler
    const positions: [String, PositionData][] = [];
    const endPromise = new Promise<void>((resolve) => pipeline.on("end", resolve));

    pipeline.on("data", ({pubkey, data}: { pubkey: string, data: string }) => {
        if (!data.startsWith(BASE64_ENCODED_POSITION_ACCOUNT_DATA_PREFIX)) {
            // not a Position account
            return;
        }

        // rebuild PositionData from base64 encoded data
        const positionData = ParsablePosition.parse(
            new PublicKey(pubkey),
            {
                data: Buffer.from(data, "base64"),
                // the followings are dummy data. only "data" is important field
                executable: false,
                lamports: 0,
                owner: PublicKey.default,
                rentEpoch: 0
            }
        ) as PositionData;

        positions.push([pubkey, positionData]);
    });

    // wait for the end of pipeline
    await endPromise;

    // print first 10 positions (too many positions)
    for (let i = 0; i < positions.length && i < 10; i++) {
        const [pubkey, positionData] = positions[i];
        console.log("Position:", pubkey);
        console.log("\twhirlpool", positionData.whirlpool.toString());
        console.log("\tliquidity", positionData.liquidity.toString());
        console.log("\tmint", positionData.positionMint.toString());
    }
    console.log("Total positions:", positions.length);
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/16b_get_positions_from_replayer_data.ts 
Position: 11Uh2JSf1Cxcrp2JJHeF3vdmMz1fZAYT9ABsC1g6eTL
        whirlpool 53nb67RHfUyfFD8BYUQrnx1A5Ro69aw14bYEaKQzzCed
        liquidity 1014905094457
        mint 5h5GSCL5ADhcbS6sp2HYjsRccaZQY34JKZKGqnRAUqou
Position: 123Z97As2puQcTXLkuzgsfBwmdvLepzz1XohvaFdW8Cq
        whirlpool 7vq59hYM44myoXCGjmZ4GyGYSFH4qUKKNAaPHQ5oeJCg
        liquidity 9540873730
        mint GZtrMTT5VXPZiETisUZy8EmtmTCdgQ7ikUA8MtzipyrU
Position: 123d4M6C5xxeAe2mUR4svPzHxRk8EwyAtk4MPphWMnrb
        whirlpool HrLmpzp8Nu5wkn9SGZYSS9Ms6deTvMgGc6BETp4161ZX
        liquidity 13317406
        mint DDAgaECG2CnKoVRifybpMV1faWErGhWsoZ9KxYsx7bWL
Position: 123fyS44Mrpeh9rFZFbYdxwfNj7L6P5N27e8WM9M1Z18
        whirlpool C1CjsZdssqbSkk81ADPxJisZWZkb53TZbLxGPMwz6976
        liquidity 14477939273
        mint 5JVeeftEb9dBvww7wvepD1MSAcawwQsyEsx6jKNU9Q8P
Position: 125b6T3nfdtBzJsVhfWjG17HLH2883yjHXRM7c2G4Wpq
        whirlpool AiMZS5U3JMvpdvsr1KeaMiS354Z1DeSg5XjA4yYRxtFf
        liquidity 0
        mint Bhup6DNLeVtCLX78HQ8NnEw1h1q6VVsG2pUbsDfXi5yt
Position: 127Y5ADWzVJzi7KmeWwtqtswfbo8z68YqzewTEWmMG5n
        whirlpool DKVSTt1CuCYGk1uPiFVwMRcQkR6zUVqTX82qgvxsPGPt
        liquidity 0
        mint 4L5ubQWoLXDX3DBkzgpLCwee8rg9kDySu84CYZPoNDXc
Position: 128axfBTPfLdXFk2LgWJBMDcGXgYKULVh2GzNGVaHAfP
        whirlpool D4St43Z1UqbV3xGfhu9wv2iZ9vLoXiW6mfhPcFr3RQZa
        liquidity 372687112498
        mint 6qkiEmXuHtQZMZGDRzHzHmuz7oMcspG9MjXDVyGiTkaM
Position: 1292nnN5JNF63Nrtucnz87pyo9mDbHSyJ6zgw5FepT9R
        whirlpool 3jLRacqwVaxLC6fSNaZSHiC7samXPkSkJ3j5d6QJUaEL
        liquidity 337651402
        mint FTkmmE8feLbwtZUsXn69aQnaYPhVHWjzFDcJiZ2Gnc7z
Position: 12958tjGsqFke6vhBpUaoPe1HUdcn6ByjMySkdjwA5N1
        whirlpool 4rJktf4exNDLBjkm3RPD8BBYihTZKVtr8jPpy7DjNrQA
        liquidity 0
        mint BoLpCPNwAs57bULg5XDZ5cqQSJrSJsvHvqvPkAXGq9pg
Position: 129vA5z2ptoxeEiQ9ykZbHqaw56tFJdjuf443VwySGYj
        whirlpool BqnpCdDLPV2pFdAaLnVidmn3G93RP2p5oRdGEY2sJGez
        liquidity 0
        mint p98cWw5tDsRufxBz6Mz8L6tzzHeLJnmFA8kWnyq4C5k
Total positions: 66662

*/
