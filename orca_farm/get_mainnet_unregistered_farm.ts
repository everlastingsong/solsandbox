import { Keypair, Connection, PublicKey, sendAndConfirmRawTransaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getOrca, OrcaPoolConfig, Network, OrcaFarmConfig } from '@orca-so/sdk';
import { OrcaFarmParams } from '@orca-so/sdk/dist/model/orca/farm/farm-types';

import { OrcaFarmImpl } from '@orca-so/sdk/dist/model/orca/farm/orca-farm'

const RPC_ENDPOINT_URL = "https://api.mainnet-beta.solana.com";

const commitment = 'confirmed';
const connection = new Connection(RPC_ENDPOINT_URL, { commitment: commitment, confirmTransactionInitialTimeout: 60*1000 });

async function main() {
    const orca = getOrca(connection);

    const orca_sol_farm = orca.getFarm(OrcaFarmConfig.ORCA_SOL_AQ);

    //const sao_usdc_farm = orca.getFarm(/* not registered yet... */);
    const saoUsdcAqFarmParams: OrcaFarmParams = Object.freeze({
      address: new PublicKey("4rKjrmHAmeT6bu3JNhP2NYjFgVHtt71U9yumBDKHTe14"),
      farmTokenMint: new PublicKey("A9BeGSRJJYXPrMs81rVZxvkk16fopzgG5YkngntgTu7p"),
      rewardTokenMint: new PublicKey("orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE"),
      rewardTokenDecimals: 6,
      baseTokenMint: new PublicKey("4iyU77yZbg8iD344vbwruAuDAf9i1EVV3FhZJDnWStBE"),
      baseTokenDecimals: 6,
    });
    const sao_usdc_farm = new OrcaFarmImpl(connection, saoUsdcAqFarmParams);

    console.log("ORCA/SOL");
    console.log(" dailyEmissions: ", (await orca_sol_farm.getDailyEmissions()).toNumber());
    console.log(" farmSupply: ", (await orca_sol_farm.getFarmSupply()).toNumber());

    console.log("SAO/USDC");
    console.log(" dailyEmissions: ", (await sao_usdc_farm.getDailyEmissions()).toNumber());
    console.log(" farmSupply: ", (await sao_usdc_farm.getFarmSupply()).toNumber());
}

main();

/*

$ ts-node src/get_mainnet_unregistered_farm.ts 
ORCA/SOL
 dailyEmissions:  9851.839283
 farmSupply:  12159071.767596
SAO/USDC
 dailyEmissions:  49.259196
 farmSupply:  706154.249442

 */
