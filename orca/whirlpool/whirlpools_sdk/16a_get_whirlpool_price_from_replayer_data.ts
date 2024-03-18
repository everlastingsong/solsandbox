// for whirlpools-sdk v0.11.x

import { PublicKey } from "@solana/web3.js";
import {
    PriceMath, ParsableWhirlpool, WhirlpoolData
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
const WHIRLPOOL_REPLAYER_PUBLIC_REMOTE_STORAGE_ENDPOINT = "https://whirlpool-replay.pleiades.dev/alpha";

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

    // targets are some SOL/USDC whirlpools
    const SOL_DECIMALS = 9;
    const USDC_DECIMALS = 6;
    const targetWhirlpoolAddressList = [
        "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE", // SOL/USDC(ts=4)
        "HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ", // SOL/USDC(ts=64)
        "DFVTutNYXD8z4T5cRdgpso1G3sZqQvMHWpW2N99E4DvE", // SOL/USDC(ts=128)
    ];

    // please use local cache if you need to execute multiple times (to save outbound transfer)
    // wget https://whirlpool-replay.pleiades.dev/alpha/2024/0316/whirlpool-state-20240316.json.gz

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
    pipeline.on("data", ({pubkey, data}: { pubkey: string, data: string }) => {
        // ignore accounts not listed in targetWhirlpoolAddressList
        if (!targetWhirlpoolAddressList.includes(pubkey)) return;

        // rebuild WhirlpoolData from base64 encoded data
        const whirlpoolData = ParsableWhirlpool.parse(
            new PublicKey(pubkey),
            {
                data: Buffer.from(data, "base64"),
                // the followings are dummy data. only "data" is important field
                executable: false,
                lamports: 0,
                owner: PublicKey.default,
                rentEpoch: 0
            }
        ) as WhirlpoolData;

        console.log("Whirlpool:", pubkey);
        console.log("\tliquidity", whirlpoolData.liquidity.toString());
        console.log("\ttickCurrentIndex", whirlpoolData.tickCurrentIndex);
        console.log("\tsqrtPrice", whirlpoolData.sqrtPrice.toString());
        console.log("\tprice", PriceMath.sqrtPriceX64ToPrice(whirlpoolData.sqrtPrice, SOL_DECIMALS, USDC_DECIMALS).toFixed(6));    
    });
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/16a_get_whirlpool_price_from_replayer_data.ts 

Whirlpool: Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE
        liquidity 160717895952190
        tickCurrentIndex -17041
        sqrtPrice 7868664179010159077
        price 181.954406
Whirlpool: DFVTutNYXD8z4T5cRdgpso1G3sZqQvMHWpW2N99E4DvE
        liquidity 336383724181
        tickCurrentIndex -17084
        sqrtPrice 7851770059000648797
        price 181.173928
Whirlpool: HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
        liquidity 915386932210
        tickCurrentIndex -17056
        sqrtPrice 7862950729490433729
        price 181.690267

*/
