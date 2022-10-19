import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import { OrcaFarmParams } from "@orca-so/sdk/dist/model/orca/farm/farm-types";
import { OrcaFarmImpl } from '@orca-so/sdk/dist/model/orca/farm/orca-farm'

async function main() {
  const RPC_ENDPOINT_URL = "https://api.devnet.solana.com";

  // MY WALLET SETTING
  const id_json_path = require('os').homedir() + "/.config/solana/id.json";
  const secret = Uint8Array.from(JSON.parse(require("fs").readFileSync(id_json_path)));
  const wallet = Keypair.fromSecretKey(secret as Uint8Array);

  const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");

  // MY OWN FARM SETTING
  const sol_devusdc_farm_params: OrcaFarmParams = Object.freeze({
    address: new PublicKey("8brfnQEW8eRLfwcw91BWVjxdXimyc8sSck8tGaSxauor"),
    farmTokenMint: new PublicKey("2996fJGSZd1B1DNoSQ4r4a32zuL9LWM9zAfzSJbpwFKk"),
    rewardTokenMint: new PublicKey("FBZ4PkFMma9zfFzx6eLRrh2g8qY4Vnj2BiXNRASFT6vg"),
    rewardTokenDecimals: 6,
    baseTokenMint: new PublicKey("7AEdkVjrFAfYMgJTRW7VAXyxiq7652t8eQWa5JcDL7fM"),
    baseTokenDecimals: 6,
  });

  const sol_devusdc_farm = new OrcaFarmImpl(connection, sol_devusdc_farm_params);

  const dailyEmission = await sol_devusdc_farm.getDailyEmissions();
  console.log("Daily Emission", dailyEmission.toNumber(), "ORCA");

  const farm_supply = await sol_devusdc_farm.getFarmSupply();
  console.log("Farm Supply", farm_supply.toNumber());

  const farm_balance = await sol_devusdc_farm.getFarmBalance(wallet.publicKey);
  console.log("Farm Balance", farm_balance.toNumber(), "share:", farm_balance.toNumber()/farm_supply.toNumber()*100, "%");

  const harvestable = await sol_devusdc_farm.getHarvestableAmount(wallet.publicKey);
  console.log("Harvestable", harvestable.toNumber(), "ORCA");
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/check_farm_reward.ts 
Daily Emission 14.285714 ORCA
Farm Supply 400.467745
Farm Balance 400.467745 share: 100 %
Harvestable 0.286871 ORCA

*/