import { WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, IGNORE_CACHE } from "@orca-so/whirlpools-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

// bash$ export ANCHOR_PROVIDER_URL=<YOUR RPC ENDPOINT>
// bash$ export ANCHOR_WALLET=<YOUR WALLET JSON FILEPATH>
// bash$ ts-node this_script.ts

async function main() {
  const provider = AnchorProvider.env();
  console.log("connection endpoint", provider.connection.rpcEndpoint);
  console.log("wallet", provider.wallet.publicKey.toBase58());

  const ctx = WhirlpoolContext.from(provider.connection, provider.wallet, ORCA_WHIRLPOOL_PROGRAM_ID);

  const targetPoolPubkey = new PublicKey("HG3PENLjhRsUGsja33RHaGzp5Rng5Xr7XX1bSuq9LFdY");

  // list all Position accounts in the pool
  const allPositionsInThePool = await ctx.connection.getProgramAccounts(
    ctx.program.programId,
    {
      dataSlice: {length: 0, offset: 0}, // no data
      filters: [
        {dataSize: 216}, // size of Position account
        {memcmp: {offset: 8, bytes: targetPoolPubkey.toBase58()}}, // Position account hold whirlpool address at 8th bytes
      ],
    }
  );
  const addresses = allPositionsInThePool.map((a) => a.pubkey);

  console.log("addresses", addresses.map((a) => a.toBase58()));

  // fetch Position accounts
  const positions = await ctx.fetcher.getPositions(addresses, IGNORE_CACHE);

  // check owner
  for (const address of addresses) {
    const position = positions.get(address.toBase58());
    const mint = position.positionMint;

    // getTokenLargestAccounts will list top 20 token holders.
    // position mint is NFT, so only 1 owner should be listed.
    const owners = await ctx.connection.getTokenLargestAccounts(mint);

    if (owners.value.length === 0) {
      console.log(address.toBase58(), "positionNFT has been bnurnt...");
    } else {
      const ownerTokenAccountAddress = owners.value[0].address;

      // memo: we can fetch those accounts in batch
      const ownerTokenAccount = await ctx.fetcher.getTokenInfo(ownerTokenAccountAddress, IGNORE_CACHE);
      const owner = ownerTokenAccount.owner;

      console.log(address.toBase58(), `owner is ${owner.toBase58()}`);
    }
  }
}

main();
