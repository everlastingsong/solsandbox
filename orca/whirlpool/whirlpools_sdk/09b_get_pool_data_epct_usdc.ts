// npm install @orca-so/whirlpools-sdk
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import {
    WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PDAUtil, ORCA_WHIRLPOOLS_CONFIG, PriceMath
} from "@orca-so/whirlpools-sdk";
import { Wallet } from "@project-serum/anchor";


async function main() {
  const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";

  const EPCT = {mint: new PublicKey("CvB1ztJvpYQPvdPBePtRzjL4aQidjydtUz61NWgcgQtP"), decimals: 6, symbol: "EPCT"};
  const USDC = {mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), decimals: 6, symbol: "USDC"};
  const tickSpacing = 64;

  // create a client with dummy wallet & solana public RPC
  const connection = new Connection(RPC_ENDPOINT, "confirmed");
  const dummyWallet = new Wallet(Keypair.generate());
  const ctx = WhirlpoolContext.from(connection, dummyWallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const client = buildWhirlpoolClient(ctx);

  // derive whirlpool address
  // EPCT/USDC(64): https://solscan.io/account/GFC7ZCkgHqWqvSoMG6DRG4XJGMgWsBpGspBQXhrSmRab
  // https://everlastingsong.github.io/account-microscope/#/whirlpool/whirlpool/GFC7ZCkgHqWqvSoMG6DRG4XJGMgWsBpGspBQXhrSmRab
  const EPCT_USDC_64_ADDRESS = PDAUtil.getWhirlpool(
    ORCA_WHIRLPOOL_PROGRAM_ID,
    ORCA_WHIRLPOOLS_CONFIG,
    EPCT.mint,
    USDC.mint,
    tickSpacing
  ).publicKey;
  console.log("address", EPCT_USDC_64_ADDRESS.toBase58());

  // get account from the chain
  const whirlpool = await client.getPool(EPCT_USDC_64_ADDRESS);
  const whirlpoolData = whirlpool.getData()

  // dump it!
  // WhirlpoolData type members: https://orca-so.github.io/whirlpools/modules.html#WhirlpoolData
  console.log("liquidity", whirlpoolData.liquidity.toString());
  console.log("sqrtPrice", whirlpoolData.sqrtPrice.toString());
  console.log("tickCurrentIndex", whirlpoolData.tickCurrentIndex);
  console.log("price (from tickCurrentIndex)", PriceMath.tickIndexToPrice(
    whirlpoolData.tickCurrentIndex,
    whirlpool.getTokenAInfo().decimals,
    whirlpool.getTokenBInfo().decimals
  ));
  console.log("price (from sqrtPrice)", PriceMath.sqrtPriceX64ToPrice(
    whirlpoolData.sqrtPrice,
    whirlpool.getTokenAInfo().decimals,
    whirlpool.getTokenBInfo().decimals
  ));
  console.log("tokenMintA", whirlpoolData.tokenMintA.toBase58());
  console.log("tokenMintB", whirlpoolData.tokenMintB.toBase58());
  console.log("tokenVaultA", whirlpoolData.tokenVaultA.toBase58());
  console.log("tokenVaultB", whirlpoolData.tokenVaultB.toBase58());
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/09b_get_pool_data_epct_usdc.ts 
address GFC7ZCkgHqWqvSoMG6DRG4XJGMgWsBpGspBQXhrSmRab
liquidity 1772223483724
sqrtPrice 2178330222627280508
tickCurrentIndex -42729
price (from tickCurrentIndex) 0.01394427332630833347184634346735413659814
price (from sqrtPrice) 0.01394466190460554736164500144387251778427
tokenMintA CvB1ztJvpYQPvdPBePtRzjL4aQidjydtUz61NWgcgQtP
tokenMintB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
tokenVaultA FBpyTD25225QS4SvDvnSnBR6w4hjnvEUi39KkCXpVAcj
tokenVaultB EhsmkqCh2ByCGBQcBsWzU2LEVZ5KS2VntR7nnaYDEhLH

*/
