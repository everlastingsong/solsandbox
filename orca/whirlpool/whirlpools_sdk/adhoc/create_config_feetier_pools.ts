import { WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient, WhirlpoolIx, PDAUtil, PriceMath } from "@orca-so/whirlpools-sdk";
import { TransactionBuilder } from "@orca-so/common-sdk";
import { AnchorProvider, Wallet } from "@project-serum/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import Decimal from "decimal.js";

/*
How to startup solana-test-validator with required accounts

  1. get accounts from mainnet-beta

    solana program dump -u m whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc whirlpool.so
    solana account -u m --output json-compact --output-file WBTC.json 9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E
    solana account -u m --output json-compact --output-file WETH.json 7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs
    solana account -u m --output json-compact --output-file USDC.json EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

  2. startup solana-test-validator with required accounts
     (--reset is optional)

    solana-test-validator \
      --bpf-program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc whirlpool.so \
      --account 9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E WBTC.json \
      --account 7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs WETH.json \
      --account EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v USDC.json \
      --reset

How to check transaction log of solana-test-validator

  Solana Explorer can connect to custom RPC
  https://explorer.solana.com/?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899

*/

const RPC_ENDPOINT_URL="http://localhost:8899";
const WBTC = {mint: new PublicKey("9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E"), decimals: 6};
const WETH = {mint: new PublicKey("7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs"), decimals: 8};
const USDC = {mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), decimals: 6};

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL);
  const wallet = new Wallet(Keypair.generate());

  const ctx = WhirlpoolContext.from(connection, wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const fetcher = new AccountFetcher(connection);
  const client = buildWhirlpoolClient(ctx);
  console.log("endpoint", ctx.connection.rpcEndpoint);

  // airdrop
  const signature0 = await connection.requestAirdrop(wallet.publicKey, 10_000_000_000 /* 10 SOL */);
  console.log("signature0", signature0);
  await ctx.connection.confirmTransaction(signature0);

  // check required account
  // need to import these accounts from mainnet-beta
  const wbtc_check = await fetcher.getMintInfo(WBTC.mint);
  const weth_check = await fetcher.getMintInfo(WETH.mint);
  const usdc_check = await fetcher.getMintInfo(USDC.mint);
  if ( wbtc_check === null || weth_check === null || usdc_check === null ) {
    console.log("required accounts were not found!!!");
    return;
  }

  // create Config and FeeTier (64)
  const config_keypair = Keypair.generate();
  const feetier64_pda = PDAUtil.getFeeTier(ctx.program.programId, config_keypair.publicKey, 64);

  const create_config_feetier_txbuilder = new TransactionBuilder(connection, wallet);
  create_config_feetier_txbuilder
  // create config
  .addInstruction(WhirlpoolIx.initializeConfigIx(ctx.program, {
    funder: wallet.publicKey,
    feeAuthority: wallet.publicKey,
    collectProtocolFeesAuthority: wallet.publicKey,
    rewardEmissionsSuperAuthority: wallet.publicKey,
    defaultProtocolFeeRate: 300, // 300/10000 = 3%
    whirlpoolsConfigKeypair: config_keypair,
  }))
  // create feetier with tickspacing 64
  .addInstruction(WhirlpoolIx.initializeFeeTierIx(ctx.program, {
    funder: wallet.publicKey,
    whirlpoolsConfig: config_keypair.publicKey,
    feeAuthority: wallet.publicKey,
    tickSpacing: 64,
    feeTierPda: feetier64_pda,
    defaultFeeRate: 2000, // 2000/1000000 = 0.2%
  }));

  const signature1 = await create_config_feetier_txbuilder.buildAndExecute();
  console.log("signature1", signature1);
  await ctx.connection.confirmTransaction(signature1);

  // create pools
  const wbtc_usdc_64_pda = PDAUtil.getWhirlpool(ctx.program.programId, config_keypair.publicKey, WBTC.mint, USDC.mint, 64);
  const weth_usdc_64_pda = PDAUtil.getWhirlpool(ctx.program.programId, config_keypair.publicKey, WETH.mint, USDC.mint, 64);

  const create_pools_txbuilder = new TransactionBuilder(connection, wallet);
  create_pools_txbuilder
  // create WBTC/USDC whirlpool
  .addInstruction(WhirlpoolIx.initializePoolIx(ctx.program, {
    funder: wallet.publicKey,
    whirlpoolsConfig: config_keypair.publicKey,
    tokenMintA: WBTC.mint,
    tokenMintB: USDC.mint,
    tokenVaultAKeypair: Keypair.generate(),
    tokenVaultBKeypair: Keypair.generate(),
    tickSpacing: 64,
    feeTierKey: feetier64_pda.publicKey,
    initSqrtPrice: PriceMath.priceToSqrtPriceX64(new Decimal(24000), WBTC.decimals, USDC.decimals),
    whirlpoolPda: wbtc_usdc_64_pda,
  }))
  // create WETH/USDC whirlpool
  .addInstruction(WhirlpoolIx.initializePoolIx(ctx.program, {
    funder: wallet.publicKey,
    whirlpoolsConfig: config_keypair.publicKey,
    tokenMintA: WETH.mint,
    tokenMintB: USDC.mint,
    tokenVaultAKeypair: Keypair.generate(),
    tokenVaultBKeypair: Keypair.generate(),
    tickSpacing: 64,
    feeTierKey: feetier64_pda.publicKey,
    initSqrtPrice: PriceMath.priceToSqrtPriceX64(new Decimal(1600), WETH.decimals, USDC.decimals),
    whirlpoolPda: weth_usdc_64_pda,
  }))
  // change feerate of WETH/USDC whirlpool
  .addInstruction(WhirlpoolIx.setFeeRateIx(ctx.program, {
    whirlpool: weth_usdc_64_pda.publicKey,
    whirlpoolsConfig: config_keypair.publicKey,
    feeAuthority: wallet.publicKey,
    feeRate: 5000, // 5000/1000000 = 0.5%
  }));
  
  const signature2 = await create_pools_txbuilder.buildAndExecute();
  console.log("signature2", signature2);
  await ctx.connection.confirmTransaction(signature2);

  // check created pools
  const wbtc_usdc_64_whirlpool = (await client.getPool(wbtc_usdc_64_pda.publicKey)).getData();
  const weth_usdc_64_whirlpool = (await client.getPool(weth_usdc_64_pda.publicKey)).getData();

  console.log("wbtc_usdc_64_whirlpool",
    "tokenA", wbtc_usdc_64_whirlpool.tokenMintA.toBase58(),
    "tokenB", wbtc_usdc_64_whirlpool.tokenMintB.toBase58(),
    "tickSpacing", wbtc_usdc_64_whirlpool.tickSpacing,
    "feeRate", wbtc_usdc_64_whirlpool.feeRate,
  );

  console.log("weth_usdc_64_whirlpool",
    "tokenA", weth_usdc_64_whirlpool.tokenMintA.toBase58(),
    "tokenB", weth_usdc_64_whirlpool.tokenMintB.toBase58(),
    "tickSpacing", weth_usdc_64_whirlpool.tickSpacing,
    "feeRate", weth_usdc_64_whirlpool.feeRate,
  );
}

main();

/*
SAMPLE OUTPUT:

$ ts-node create_config_feetier_pools.ts 
endpoint http://localhost:8899
signature0 5Gt49Y5r4bFHsNoTuA3R6NrCitZHANZzvMYm1hCNLYBdKExWs2BvB8kaK2e3Ck2pnpSr9tKCQ3kEoS1bQRfyb9X8
signature1 2g9TnhtFreRuma5RD4gp2FtG22QH8k4PrnskAyniKTXRZFweNVhw1BbNFtXee1X6RV1pYbTg4e2FXyf6tA2mh18F
signature2 1wvr4cRopvRjYdPdXcaPJquaDjCBmE5nQiZ9ZdTiWyaxjxadooAdDKQrZpoFAU9UCJjbudbr4vWfPN84buDZkpR
wbtc_usdc_64_whirlpool tokenA 9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E tokenB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v tickSpacing 64 feeRate 2000
weth_usdc_64_whirlpool tokenA 7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs tokenB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v tickSpacing 64 feeRate 5000

*/