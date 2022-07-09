import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { DevTokenSwapper } from "../target/types/dev_token_swapper";

describe("dev_token_swapper", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.DevTokenSwapper as Program<DevTokenSwapper>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
