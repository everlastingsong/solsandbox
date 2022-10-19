import { Keypair, Connection, PublicKey, sendAndConfirmRawTransaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getOrca, OrcaPoolConfig, Network } from '@orca-so/sdk';
import { OrcaPoolParams, CurveType } from '@orca-so/sdk/dist/model/orca/pool/pool-types';
import { OrcaFarmParams } from "@orca-so/sdk/dist/model/orca/farm/farm-types";
import { Percentage } from '@orca-so/sdk/dist/public/utils/models/percentage';
import { OrcaPoolImpl } from '@orca-so/sdk/dist/model/orca/pool/orca-pool'
import { OrcaFarmImpl } from '@orca-so/sdk/dist/model/orca/farm/orca-farm'
import * as Tokens from '@orca-so/sdk/dist/constants/tokens';
import Decimal from 'decimal.js';

async function main() {
  const RPC_ENDPOINT_URL = "https://api.devnet.solana.com";

  // MY WALLET SETTING
  const id_json_path = require('os').homedir() + "/.config/solana/id.json";
  const secret = Uint8Array.from(JSON.parse(require("fs").readFileSync(id_json_path)));
  const wallet = Keypair.fromSecretKey(secret as Uint8Array);

  const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");

  // MY OWN POOL SETTING
  const devusdc_pubkey = new PublicKey("FMwbjM1stnTzi74LV4cS937jeSUds7mZDgcdgnJ1yBDw");
  const sol_devusdc_pool_params: OrcaPoolParams = Object.freeze({
    address: new PublicKey("DosfiDxjKb9b3XAuqwZ8cbg7F9iWtuew1PpKrkXUxi1V"),
    nonce: 255,
    authority: new PublicKey("EAj5W6dVep8xK5MXgu22sD28cBWLmGc3GL963sMVod44"),
    poolTokenMint: new PublicKey("7AEdkVjrFAfYMgJTRW7VAXyxiq7652t8eQWa5JcDL7fM"),
    poolTokenDecimals: 6,
    feeAccount: new PublicKey("67kMLL5ezDoxRD3PAtNP1LDE9oV4archrmNeePySHLQ"),
    tokenIds: [Tokens.solToken.mint.toString(), devusdc_pubkey.toString()],
    tokens: {
      [Tokens.solToken.mint.toString()]: {
        ...Tokens.solToken,
        addr: new PublicKey("C3cMYaFPADiGYJjdYTZ7PiuduMuuGLRV3Nsdo1N1m1xo"),
      },
      [devusdc_pubkey.toString()]: {
        tag: "DevUSDC",
        name: "Devnet USD Coin",
        mint: devusdc_pubkey,
        scale: 6,
        addr: new PublicKey("GKmRB5Zpq77aws79YDZ3Ekke4x5g6mBJqCq86vy36Yqe"),
      },
    },
    curveType: CurveType.ConstantProduct,
    feeStructure: {
      traderFee: Percentage.fromFraction(25, 10000),
      ownerFee: Percentage.fromFraction(5, 10000),
    },
  });

  // MY OWN FARM SETTING
  const sol_devusdc_farm_params: OrcaFarmParams = Object.freeze({
    address: new PublicKey("8brfnQEW8eRLfwcw91BWVjxdXimyc8sSck8tGaSxauor"),
    farmTokenMint: new PublicKey("2996fJGSZd1B1DNoSQ4r4a32zuL9LWM9zAfzSJbpwFKk"),
    rewardTokenMint: new PublicKey("FBZ4PkFMma9zfFzx6eLRrh2g8qY4Vnj2BiXNRASFT6vg"),
    rewardTokenDecimals: 6,
    baseTokenMint: new PublicKey("7AEdkVjrFAfYMgJTRW7VAXyxiq7652t8eQWa5JcDL7fM"),
    baseTokenDecimals: 6,
  });

  const sol_devusdc_pool = new OrcaPoolImpl(connection, Network.DEVNET, sol_devusdc_pool_params);
  const sol_devusdc_farm = new OrcaFarmImpl(connection, sol_devusdc_farm_params);

  // Pool Deposit
  const sol_max_deposit = new Decimal(1);
  const usdc_max_deposit = new Decimal(100);
  const { maxTokenAIn, maxTokenBIn, minPoolTokenAmountOut } = await sol_devusdc_pool.getDepositQuote(
    sol_max_deposit,
    usdc_max_deposit
  );
  console.log(`Deposit at most ${maxTokenAIn.toNumber()} SOL and ${maxTokenBIn.toNumber()} devUSDC for at least ${minPoolTokenAmountOut.toNumber()} LP Token`);

  const pool_deposit_payload = await sol_devusdc_pool.deposit(
    wallet,
    maxTokenAIn,
    maxTokenBIn,
    minPoolTokenAmountOut
  );
  const pool_deposit_signature = await pool_deposit_payload.execute();
  console.log("pool deposit signature", pool_deposit_signature);
  await connection.confirmTransaction(pool_deposit_signature);

  // Farm Deposit
  const lp_balance = await sol_devusdc_pool.getLPBalance(wallet.publicKey);
  console.log("LP Balance", lp_balance.toNumber());

  const farm_deposit_payload = await sol_devusdc_farm.deposit(
    wallet,
    lp_balance
  );
  const farm_deposit_signature = await farm_deposit_payload.execute();
  console.log("farm deposit signature", farm_deposit_signature);
  await connection.confirmTransaction(farm_deposit_signature);

  const farm_balance = await sol_devusdc_farm.getFarmBalance(wallet.publicKey);
  console.log("Farm Balance", farm_balance.toNumber());
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/deposit_devnet_pool_and_farm.ts 
Deposit at most 1 SOL and 100 devUSDC for at least 400.467745 LP Token
pool deposit signature 46GqipVRiSbZW5LCcaFHkH6AJxT7t9bMsAm9tcqMXa7yEQrSCUiwXcmFuYYbL625BcY4xGYyk5UZT1wrZLWP37aY
LP Balance 400.467745
farm deposit signature 5xDc6nUSM5k3dK2KPB1xi5UFxx1B6UL2g4t41KVVs3MvdTBQXthydizjr34jKaRofxYiPRs8AvgD6gyMSYPnbxKW
Farm Balance 400.467745

 */