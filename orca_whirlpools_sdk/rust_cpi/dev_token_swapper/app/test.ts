import * as idl from "../target/idl/dev_token_swapper.json";
import type { DevTokenSwapper } from "../target/types/dev_token_swapper";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
//import { PDAUtil } from "@orca-so/whirlpools-sdk";

// UNIX/Linux/Mac
// bash$ export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts

async function initialize_token_account(
  program: Program<DevTokenSwapper>,
  mint: anchor.web3.PublicKey,
  fund: anchor.web3.PublicKey,
) {
  const [authority, bump] = anchor.web3.PublicKey.findProgramAddressSync([Uint8Array.from(Buffer.from("authority"))], program.programId);
  console.log("authority", authority.toBase58(), "bump", bump);
  
  const token_account = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, mint, authority, true);
  console.log("token_account", token_account.toBase58());
  
  const signature = await program.rpc.initializeTokenAccount(bump, {
    accounts: {
      fund: fund,
      authority: authority,
      mint: mint,
      tokenAccount: token_account,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
    signers: [],
  });
  console.log("initialize_token_account signature", signature);
}

async function main() {
  anchor.setProvider(anchor.AnchorProvider.env());

  const devSAMO = {symbol: "devSAMO", mint: new anchor.web3.PublicKey("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"),  decimals: 9};
  const devUSDC = {symbol: "devUSDC", mint: new anchor.web3.PublicKey("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6};

  const DEV_TOKEN_SWAPPER_PROGRAM_ID = new anchor.web3.PublicKey("GKmRtfNxom1xKR6t1NGYZTEkz19xMhT1cGx143vG3UCh");
  const wallet = anchor.AnchorProvider.env().wallet;
  const program = new Program(idl as anchor.Idl, DEV_TOKEN_SWAPPER_PROGRAM_ID, anchor.getProvider()) as Program<DevTokenSwapper>;
  const connection = anchor.getProvider().connection;

  //initialize_token_account(program, devSAMO.mint, wallet.publicKey);
  //initialize_token_account(program, devUSDC.mint, wallet.publicKey);

  const whirlpoolProgram = new anchor.web3.PublicKey("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc");
  const whirlpool = new anchor.web3.PublicKey("EgxU92G34jw6QDG9RuTX9StFg1PmHuDqkRKAE5kVEiZ4");
  const authority = new anchor.web3.PublicKey("3oVuxYFmQZQP9uHxw8ws4F6QLs9mkaWJZmTHf2y1F4Fd");
  const bump = 253;
  const token_owner_a = new anchor.web3.PublicKey("FM17AKRNDx5dYmDEcdzzBg148vPnFRhssFWsHPkgpZi7");
  const token_owner_b = new anchor.web3.PublicKey("2VaJvKxZtDkvLVibt8mWVaJwbJrcovkfhPXiXroxZU82");
  const token_vault_a = new anchor.web3.PublicKey("GedZgiHw8dJpR6Fyt1PNgSwYznEyh18qgZvobuxYxMQ3");
  const token_vault_b = new anchor.web3.PublicKey("4KDudC7XagDiZZbd9Xzabcy5yZMC8bvz7c8q7Bb9vXTa");

  const tick_array_0 = new anchor.web3.PublicKey("beSZSvEcPG3GMsSpgqD4NDXHSAbBVd4rTQ1Nc9p9Quc");
  const tick_array_1 = new anchor.web3.PublicKey("9AQxHkiVJqoXRUvP9FpoXUcZ1HCEHpJHp8eZVRocK7Wx");
  const tick_array_2 = new anchor.web3.PublicKey("B6n4APQbms1BdY5Ev1V9hjgz3NC94f7ws8qG9e3bpedE");
  const tick_array_3 = new anchor.web3.PublicKey("9H4aVdyXbnnmbSJLjYahvZzrgdHyWVMq8i1v1fD7jqBt");
  const tick_array_4 = new anchor.web3.PublicKey("G13PKFAkn7rLHVT1fGbLPKAQFiMe6GiRKZ6e8ipxcn9q");
  const tick_array_5 = new anchor.web3.PublicKey("76ntKkVqoLqakqHb6TdkWKuD9kNv2JbPL3k6EHudWHxd");
  const tick_array_6 = new anchor.web3.PublicKey("HCawgRPFGdgBcnziz5Xy9cAg6YjuS12nAXjjrnRqUbY5");

  const oracle = new anchor.web3.PublicKey("3dWJWYaTPMoADQvVihAc8hFu4nYXsEtBAGQwPMBXau1t");

  const target_tick_index = -115136;
  const amount_a = new anchor.BN(40000_000_000_000);
  const amount_b = new anchor.BN(400_000_000);

  const signature = await program.rpc.pushBackSwap(
    bump,
    target_tick_index,
    amount_a,
    amount_b, {
      accounts: {
        authenticator: wallet.publicKey,
        whirlpool: whirlpool,
        authority: authority,
        tokenOwnerAccountA: token_owner_a,
        tokenVaultA: token_vault_a,
        tokenOwnerAccountB: token_owner_b,
        tokenVaultB: token_vault_b,
        tickArray0: tick_array_0,
        tickArray1: tick_array_1,
        tickArray2: tick_array_2,
        tickArray3: tick_array_3,
        tickArray4: tick_array_4,
        tickArray5: tick_array_5,
        tickArray6: tick_array_6,
        oracle: oracle,
        whirlpoolProgram: whirlpoolProgram,
        tokenProgram: TOKEN_PROGRAM_ID,
        instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      signers: [],
  });
  console.log("pusuh_back_swap signature", signature);  
}

main();

/*

# devSAMO
authority 3oVuxYFmQZQP9uHxw8ws4F6QLs9mkaWJZmTHf2y1F4Fd bump 253
token_account FM17AKRNDx5dYmDEcdzzBg148vPnFRhssFWsHPkgpZi7
initialize_token_account signature 32a5iwABqh3YZCye3dNeK65C67X1EKtUEcqpdkiaaF2uVKXfSMEM9AKTzaFoZFbEuwJjsRbcFJVY6Buty1zBLrbq

# devUSDC
authority 3oVuxYFmQZQP9uHxw8ws4F6QLs9mkaWJZmTHf2y1F4Fd bump 253
token_account 2VaJvKxZtDkvLVibt8mWVaJwbJrcovkfhPXiXroxZU82
initialize_token_account signature 3wr3TfhzdQCPTcCiUkqvtjjvVd4wtrRLae3WPM81VGKnr5EWp3T1tvzCsh1zYE7wgbciEy87MbBJkK8zwinvuBbT



*/