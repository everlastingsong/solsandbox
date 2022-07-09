import * as idl from "../target/idl/cpi_with_spl_token_swap.json"; // tsconfig.json: "resolveJsonModule": true,
import type { CpiWithSplTokenSwap } from "../target/types/cpi_with_spl_token_swap";
import * as anchor from "@project-serum/anchor";
import { Program, BN } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { deriveAssociatedTokenAddress, ORCA_TOKEN_SWAP_ID_DEVNET } from "@orca-so/sdk";
import { orcaSolPool } from "@orca-so/sdk/dist/constants/devnet/pools";

// UNIX/Linux/Mac
// bash$ export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts

async function main() {
  anchor.setProvider(anchor.AnchorProvider.env());

  const CPI_WITH_SPL_TOKEN_SWAP_ID = new anchor.web3.PublicKey("J8iyBRPnF8Px4i7TBTK57EozE8P3RFEJ9GwgCsVjfEV4");
  const wallet = anchor.AnchorProvider.env().wallet;
  const program = new Program(idl as anchor.Idl, CPI_WITH_SPL_TOKEN_SWAP_ID, anchor.getProvider()) as Program<CpiWithSplTokenSwap>;
  const connection = anchor.getProvider().connection;

  const orca_token = orcaSolPool.tokens[orcaSolPool.tokenIds[0]];
  const sol_token = orcaSolPool.tokens[orcaSolPool.tokenIds[1]];

  const in_sol_amount = new BN(10_000_000); // 0.01 SOL
  const minimum_output_amount = new BN(0);  // test only...

  // assuming these ATA already exists
  const user_source = await deriveAssociatedTokenAddress(wallet.publicKey, sol_token.mint);
  const user_destination = await deriveAssociatedTokenAddress(wallet.publicKey, orca_token.mint);

  const signature = await program.rpc.proxySwap(
    in_sol_amount,
    minimum_output_amount, {
      accounts: {
        orcaSwapProgram: ORCA_TOKEN_SWAP_ID_DEVNET,
        tokenProgram: TOKEN_PROGRAM_ID,
        address: orcaSolPool.address,
        authority: orcaSolPool.authority,
        userTransferAuthority: wallet.publicKey, // no delegation
        userSource: user_source,
        poolSource: sol_token.addr,
        poolDestination: orca_token.addr,
        userDestination: user_destination,
        poolTokenMint: orcaSolPool.poolTokenMint,
        feeAccount: orcaSolPool.feeAccount,
      },
      signers: [],
  });

  console.log("proxySwap signature", signature);  
}

main();

/*

SAMPLE OUTPUT:
$ ts-node test.ts 
proxySwap signature ZnGdpXkMWSid8S2rJbfV1m7Jj3h8Kvha3MhwUfZZaB3T8pXkYiPo4nDXSgsfgBxXJDDmy7wCG2iqqeMbhowmmfz

SAMPLE TRANSACTION:
https://explorer.solana.com/tx/ZnGdpXkMWSid8S2rJbfV1m7Jj3h8Kvha3MhwUfZZaB3T8pXkYiPo4nDXSgsfgBxXJDDmy7wCG2iqqeMbhowmmfz?cluster=devnet

*/