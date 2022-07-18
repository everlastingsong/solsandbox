import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { OrcaFarmController } from "../target/types/orca_farm_controller";

// test-validator/run_solana_test_validator.sh
// anchor test --skip-local-validator --skip-deploy

describe("OrcaFarmController", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.OrcaFarmController as Program<OrcaFarmController>;

  const USER_INFO_PDA_SEED_PREFIX = "info";
  const FARM_OWNER_PDA_SEED_PREFIX = "farmowner";

  const SHDW_USDC_AQ_GLOBAL_FARM_STATE_PUBKEY = new anchor.web3.PublicKey("ABmFqgfvQjjU8uBkZL2KdH5AvYEMsuddtdvpm4s62Pzq");
  const ORCA_AQUAFARM_PROGRAM_ID = new anchor.web3.PublicKey("82yxjeMsvaURa4MbZZ7WZZHfobirZYkH1zF8fmeGtyaQ");

  const user = anchor.web3.Keypair.generate().publicKey;

  // UserInfoPDA
  const [user_info_pda_pubkey, user_info_pda_bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Uint8Array.from(Buffer.from(USER_INFO_PDA_SEED_PREFIX)), user.toBytes()],
    program.programId
  );

  // OrcaFarmOwnerPDA
  const [farm_owner_pda_pubkey, farm_owner_pda_bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Uint8Array.from(Buffer.from(FARM_OWNER_PDA_SEED_PREFIX)), user.toBytes()],
    program.programId
  );
  
  it("createUserInfo", async () => {
    const tx = await program.methods
    .createUserInfo(farm_owner_pda_bump)
    .accounts({
      funder: anchor.getProvider().publicKey,
      user: user,
      userInfoPda: user_info_pda_pubkey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();
    console.log("createUserInfo signature", tx);
  });

  it("InitUserFarm", async () => {
    // UserFarmStatePDA
    // https://github.com/orca-so/aquafarm-sdk/blob/main/src/models/UserFarm.ts#L42
    const [orca_user_farm_state_pda_pubkey, orca_user_farm_state_pda_bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [SHDW_USDC_AQ_GLOBAL_FARM_STATE_PUBKEY.toBytes(), farm_owner_pda_pubkey.toBytes(), TOKEN_PROGRAM_ID.toBytes()],
      ORCA_AQUAFARM_PROGRAM_ID
    );

    const tx = await program.methods
    .initUserFarm()
    .accounts({
      funder: anchor.getProvider().publicKey,
      user: user,
      userInfoPda: user_info_pda_pubkey,
      farmOwnerPda: farm_owner_pda_pubkey,
      orcaAquafarmProgram: ORCA_AQUAFARM_PROGRAM_ID,
      orcaGlobalFarmState: SHDW_USDC_AQ_GLOBAL_FARM_STATE_PUBKEY,
      orcaUserFarmState: orca_user_farm_state_pda_pubkey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();
    console.log("initUserFarm signature", tx);
  });

});
