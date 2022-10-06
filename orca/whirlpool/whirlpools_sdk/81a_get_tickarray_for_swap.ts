import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import {
    WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PDAUtil, ORCA_WHIRLPOOLS_CONFIG, SwapUtils, MAX_SWAP_TICK_ARRAYS, TickUtil
} from "@orca-so/whirlpools-sdk";
import { Wallet } from "@project-serum/anchor";

const RPC_ENDPOINT_URL="https://ssc-dao.genesysgo.net"


function getTickArrayPublicKeysWithShift(
  tickCurrentIndex: number,
  tickSpacing: number,
  aToB: boolean,
  programId: PublicKey,
  whirlpoolAddress: PublicKey
) {
  let offset = 0;
  let tickArrayAddresses: PublicKey[] = [];
  for (let i = 0; i < MAX_SWAP_TICK_ARRAYS; i++) {
    let startIndex: number;
    try {
      const shift = aToB ? 0 : tickSpacing;
      startIndex = TickUtil.getStartTickIndex(tickCurrentIndex + shift, tickSpacing, offset);
    } catch {
      return tickArrayAddresses;
    }

    const pda = PDAUtil.getTickArray(programId, whirlpoolAddress, startIndex);
    tickArrayAddresses.push(pda.publicKey);
    offset = aToB ? offset - 1 : offset + 1;
  }

  return tickArrayAddresses;
}

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL);
  console.log("connection endpoint", connection.rpcEndpoint);
  
  const dummy_wallet = new Wallet(Keypair.generate());
  const ctx = WhirlpoolContext.from(connection, dummy_wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const fetcher = new AccountFetcher(ctx.connection);
  const client = buildWhirlpoolClient(ctx);

  // tokens
  const SOL = {mint: new PublicKey("So11111111111111111111111111111111111111112"), decimals: 9};
  const ORCA = {mint: new PublicKey("orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE"), decimals: 6};
  const WBTC = {mint: new PublicKey("9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E"), decimals: 6};
  const WETH = {mint: new PublicKey("7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs"), decimals: 8};
  const MSOL = {mint: new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"), decimals: 9};
  const MNDE = {mint: new PublicKey("MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey"), decimals: 9};
  const SAMO = {mint: new PublicKey("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"), decimals: 9};
  const USDC = {mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), decimals: 6};
  const USDT = {mint: new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"), decimals: 6};
  const TICK_SPACING_STABLE = 1;
  const TICK_SPACING_STANDARD = 64;

  // select input
  const token_a = USDC;
  const token_b = USDT;
  const tick_spacing = TICK_SPACING_STABLE;

  // get whirlpool
  const whirlpool_key = PDAUtil.getWhirlpool(
    ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG,
    token_a.mint, token_b.mint, tick_spacing).publicKey;
  console.log("whirlpool_key", whirlpool_key.toBase58());
  const whirlpool = client.getPool(whirlpool_key);
  const whirlpool_data = (await whirlpool).getData();
  console.log("current_tick_index", whirlpool_data.tickCurrentIndex);

  const a_to_b_pubkeys = getTickArrayPublicKeysWithShift(whirlpool_data.tickCurrentIndex, whirlpool_data.tickSpacing, true,  ORCA_WHIRLPOOL_PROGRAM_ID, whirlpool_key);
  const b_to_a_pubkeys = getTickArrayPublicKeysWithShift(whirlpool_data.tickCurrentIndex, whirlpool_data.tickSpacing, false, ORCA_WHIRLPOOL_PROGRAM_ID, whirlpool_key);

  console.log("a_to_b: ", a_to_b_pubkeys[0].toBase58(), a_to_b_pubkeys[1].toBase58(), a_to_b_pubkeys[2].toBase58());
  console.log("b_to_a: ", b_to_a_pubkeys[0].toBase58(), b_to_a_pubkeys[1].toBase58(), b_to_a_pubkeys[2].toBase58());
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/81a_get_tickarray_for_swap.ts 
connection endpoint https://ssc-dao.genesysgo.net
whirlpool_key 4fuUiYxTQ6QCrdSq9ouBYcTM7bqSwYTSyLueGZLTy4T4
current_tick_index -1
a_to_b:  8kZSTVuV7C4GD9ZVR4wDtRSXv1SvsSQPfqUbthueRNGV 2B48L1ACPvVb67UKeSMkUGdzrnhvNMm6pFt2nspGKxs4 BMGfBaW69aUm6hRdmsfAcNEmAW59C2rWJ9EX7gWnrVN9
b_to_a:  FqFkv2xNNCUyx1RYV61pGZ9AMzGfgcD8uXC9zCF5JKnR A7sdy3NoAZp49cQNpreMGARAb9QJjYrrSyDALhThgk3D 9opqNK3dWUijw8VNLtvne4juCTq1qADaph29tZqkoZHa

*/