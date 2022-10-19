import { Connection, PublicKey, Keypair, Transaction } from "@solana/web3.js";
import { constructInitGlobalFarmIx } from "@orca-so/aquafarm";
import { getGlobalFarmAddress, getAuthorityAndNonce } from "@orca-so/aquafarm/dist/models/GlobalFarm";
import { ORCA_FARM_ID } from "@orca-so/sdk";
import { TOKEN_PROGRAM_ID, Token, u64 } from "@solana/spl-token";

async function create_orca_farm(
  base_token_mint: PublicKey,
  reward_token_mint: PublicKey,
  reward_token_vault: PublicKey,
  emissions_per_second_num: u64,
  emissions_per_second_denom: u64,
  connection: Connection,
  owner: Keypair,
) {
  const base_token = new Token(connection, base_token_mint, TOKEN_PROGRAM_ID, owner);
  const reward_token = new Token(connection, reward_token_mint, TOKEN_PROGRAM_ID, owner);

  // derive farm & authority address
  const [global_farm_address] = await getGlobalFarmAddress(
    base_token_mint,
    reward_token_mint,
    owner.publicKey,
    TOKEN_PROGRAM_ID,
    ORCA_FARM_ID
  );
  const [farm_authority_pda, nonce] = await getAuthorityAndNonce(global_farm_address, ORCA_FARM_ID);

  // create vault for base_token
  console.log("create vault for base token...");
  const base_token_vault = await base_token.createAccount(farm_authority_pda);

  // change authority of the vault of reward_token to 
  console.log("change authority...");
  await reward_token.setAuthority(reward_token_vault, farm_authority_pda, "AccountOwner", owner, []);

  // create farm token
  console.log("create farm token...");
  const base_token_decimals = (await base_token.getMintInfo()).decimals; // decimals of base_token and farm_token must be match
  const farm_token = await Token.createMint(connection, owner, farm_authority_pda, farm_authority_pda, base_token_decimals, TOKEN_PROGRAM_ID);

  // print keys
  console.log("keys:");
  console.log("\tglobal_farm_address", global_farm_address.toBase58());
  console.log("\tfarm_authority_pda", farm_authority_pda.toBase58(), nonce);
  console.log("\tbase_token_mint", base_token_mint.toBase58());
  console.log("\tbase_token_vault", base_token_vault.toBase58());
  console.log("\treward_token_vault", reward_token_vault.toBase58());
  console.log("\tfarm_token", farm_token.publicKey.toBase58());

  // create farm
  console.log("execute InitGlobalFarm...");
  const init_transaction = new Transaction();
  init_transaction.feePayer = owner.publicKey;
  init_transaction.add(constructInitGlobalFarmIx(
    global_farm_address,
    base_token_mint,
    base_token_vault,
    reward_token_vault,
    farm_token.publicKey,
    owner.publicKey,
    owner.publicKey,
    emissions_per_second_num,
    emissions_per_second_denom,
    nonce,
    ORCA_FARM_ID,
    owner.publicKey
  ));

  const signature = await connection.sendTransaction(init_transaction, [owner]);
  console.log("InitGlobalFarm signature", signature);
  await connection.confirmTransaction(signature);

  return {
    global_farm_address,
    base_token_mint,
    base_token_vault,
    reward_token_mint,
    reward_token_vault,
    farm_token_mint: farm_token.publicKey,
    farm_token_decimals: base_token_decimals,
    emissions_per_second_num,
    emissions_per_second_denom,
  };
}

async function main() {
  const RPC_ENDPOINT_URL = "https://api.devnet.solana.com";

  // LP token mint of pool (from create_orca_pool.ts)
  const POOL_TOKEN_MINT = new PublicKey("7AEdkVjrFAfYMgJTRW7VAXyxiq7652t8eQWa5JcDL7fM");
  // MY ORCA token on DEVNET
  const REWARD_TOKEN_MINT = new PublicKey("FBZ4PkFMma9zfFzx6eLRrh2g8qY4Vnj2BiXNRASFT6vg");

  // MY WALLET SETTING
  const id_json_path = require('os').homedir() + "/.config/solana/id.json";
  const secret = Uint8Array.from(JSON.parse(require("fs").readFileSync(id_json_path)));
  const wallet = Keypair.fromSecretKey(secret as Uint8Array);

  const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");

  // create reward vault and fill it.
  const reward_token = new Token(connection, REWARD_TOKEN_MINT, TOKEN_PROGRAM_ID, wallet);
  const reward_token_vault = await reward_token.createAccount(wallet.publicKey);
  await reward_token.mintTo(reward_token_vault, wallet, [], 10000 * 10**6 /* 10000 ORCA */);

  // emission: 100 ORCA / week
  const emissions_per_second_num = new u64(100 * 10**6);
  const emissions_per_second_denom = new u64(60*60*24*7 /* seconds/week */);

  const farm_config = await create_orca_farm(
    POOL_TOKEN_MINT,
    REWARD_TOKEN_MINT,
    reward_token_vault,
    emissions_per_second_num,
    emissions_per_second_denom,
    connection,
    wallet
  );

  console.log(
    "\ncreate_orca_farm SUCCESS!",
    "\nglobal_farm_address ", farm_config.global_farm_address.toBase58(),
    "\nbase_token_mint     ", farm_config.base_token_mint.toBase58(),
    "\nbase_token_vault    ", farm_config.base_token_vault.toBase58(),
    "\nreward_token_mint   ", farm_config.reward_token_mint.toBase58(),
    "\nreward_token_vault  ", farm_config.reward_token_vault.toBase58(),
    "\nfarm_token_mint     ", farm_config.farm_token_mint.toBase58(),
    "\nfarm_token_decimals ", farm_config.farm_token_decimals,
    "\nemissions_per_second", farm_config.emissions_per_second_num.toString(), "/", farm_config.emissions_per_second_denom.toString(),
  );
}

main();

/*
SAMPLE OUTPUT:

$ ts-node src/create_devnet_aquafarm.ts 
create vault for base token...
change authority...
create farm token...
keys:
        global_farm_address 8brfnQEW8eRLfwcw91BWVjxdXimyc8sSck8tGaSxauor
        farm_authority_pda CpFRSDrNS9U6e7YopqPMkRNPtLKWLm3dsA1bfjNE2s29 255
        base_token_mint 7AEdkVjrFAfYMgJTRW7VAXyxiq7652t8eQWa5JcDL7fM
        base_token_vault JBEX6QX3s3HbHz448sfaz9cThDfK69MorerUvMSQsnkh
        reward_token_vault Bvg96kb1Mop6Lu11ETAZdnEpEoWrB3VXagSTNRw5mnfC
        farm_token 2996fJGSZd1B1DNoSQ4r4a32zuL9LWM9zAfzSJbpwFKk
execute InitGlobalFarm...
InitGlobalFarm signature 3RvJYsbxWbinfisPW3p1BDctQCos1yY1J3nCRmyz84SpAkbbH7jZt3aF7VNeuLEcyHmNae2soUKBnLW7ATf538SP

create_orca_farm SUCCESS! 
global_farm_address  8brfnQEW8eRLfwcw91BWVjxdXimyc8sSck8tGaSxauor 
base_token_mint      7AEdkVjrFAfYMgJTRW7VAXyxiq7652t8eQWa5JcDL7fM 
base_token_vault     JBEX6QX3s3HbHz448sfaz9cThDfK69MorerUvMSQsnkh 
reward_token_mint    FBZ4PkFMma9zfFzx6eLRrh2g8qY4Vnj2BiXNRASFT6vg 
reward_token_vault   Bvg96kb1Mop6Lu11ETAZdnEpEoWrB3VXagSTNRw5mnfC 
farm_token_mint      2996fJGSZd1B1DNoSQ4r4a32zuL9LWM9zAfzSJbpwFKk 
farm_token_decimals  6 
emissions_per_second 100000000 / 604800

*/