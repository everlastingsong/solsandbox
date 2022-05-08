import { OrcaWhirlpoolClient, OrcaNetwork, priceToTickIndex, tickIndexToPrice, Percentage, getNearestValidTickIndex } from "@orca-so/whirlpool-sdk";
import { solToken, usdcToken } from "@orca-so/sdk/dist/constants/tokens";
import Decimal from "decimal.js";
import { OrcaU64 } from "@orca-so/sdk";
import { BN, Provider, Wallet } from "@project-serum/anchor";
import { Keypair, Connection } from "@solana/web3.js";
import { Token, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

// My Wallet: ~/.config/solana/id1.json
const id_json_path = require('os').homedir() + "/.config/solana/id1.json";
const secret = Uint8Array.from(JSON.parse(require("fs").readFileSync(id_json_path)));
const wallet = Keypair.fromSecretKey(secret as Uint8Array);

function to_scaled(amount: BN, scale: number): string {
  const pow10 = new Decimal(10).pow(scale);
  return new Decimal(amount.toString()).div(pow10).toFixed(scale);
}

async function main() {
  // Create provider
  const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net";
  const commitment = 'confirmed';
  const connection = new Connection(RPC_ENDPOINT_URL, commitment);
  const provider = new Provider(connection, new Wallet(wallet), Provider.defaultOptions());

  // Derive the Whirlpool address from token mints
  const orca = new OrcaWhirlpoolClient({ network: OrcaNetwork.MAINNET });
  const poolAddress = await orca.pool.derivePDA(solToken.mint, usdcToken.mint, 64).publicKey;

  // Fetch an instance of the pool
  const poolData = await orca.getPool(poolAddress);
  if (!poolData) {
    return;
  }

  // Check my balance
  const sol_balance = await connection.getBalance(wallet.publicKey, commitment);
  const usdc_account = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, usdcToken.mint, wallet.publicKey);
  const usdc_balance = (await connection.getTokenAccountBalance(usdc_account)).value.amount;
  console.log("MY ACCOUNT BALANCE");
  console.log("  SOL :", to_scaled(new BN(sol_balance.toString()), solToken.scale));
  console.log("  USDC:", to_scaled(new BN(usdc_balance.toString()), usdcToken.scale));

  // Open a position
  const openPositionQuote = await orca.pool.getOpenPositionQuote({
    poolAddress,
    tokenMint: solToken.mint,
    tokenAmount: OrcaU64.fromNumber(0.01, solToken.scale).toU64(),
    refresh: true,
    // index must be mutiple of tickSpacing
    // priceToTickIndex doesn't return multiple of tickSpacing, so getNearestValidTickIndex is appropriate
    tickLowerIndex: getNearestValidTickIndex(new Decimal("75.8" /* USDC */), solToken.scale, usdcToken.scale, poolData.tickSpacing),
    tickUpperIndex: getNearestValidTickIndex(new Decimal("81.0" /* USDC */), solToken.scale, usdcToken.scale, poolData.tickSpacing),
    slippageTolerance: Percentage.fromDecimal(new Decimal(0.1 /* % */))
  });

  console.log("OPEN POSITION QUOTE");
  console.log("  SOL price", poolData.price);
  console.log("  poolAddress", openPositionQuote.poolAddress.toString());
  console.log("  tickLowerIndex/Price", openPositionQuote.tickLowerIndex, tickIndexToPrice(openPositionQuote.tickLowerIndex, solToken.scale, usdcToken.scale));
  console.log("  tickUpperIndex/Price", openPositionQuote.tickUpperIndex, tickIndexToPrice(openPositionQuote.tickUpperIndex, solToken.scale, usdcToken.scale));
  console.log("  maxTokenA", to_scaled(openPositionQuote.maxTokenA, solToken.scale), solToken.tag);
  console.log("  maxTokenB", to_scaled(openPositionQuote.maxTokenB, usdcToken.scale), usdcToken.tag);
  console.log("  liquidity", openPositionQuote.liquidity.toString());

  const openPositionTx = await orca.pool.getOpenPositionTx({
    provider,
    quote: openPositionQuote,
  });
  const openPositionTxId = await openPositionTx.tx.buildAndExecute();
  console.log("TXID:", openPositionTxId);
}

main();

/*

$ ts-node deposit_mainnet_whirlpool_solusdc.ts 
MY ACCOUNT BALANCE
  SOL : 0.071974410
  USDC: 5.065301
OPEN POSITION QUOTE
  SOL price 77.85371218267101389115690308770989738306
  poolAddress HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
  tickLowerIndex/Price -25792 75.84442709495855804708197873153612772254
  tickUpperIndex/Price -25088 81.37602615265468921027263527444340661638
  maxTokenA 0.010010000 SOL
  maxTokenB 0.462590 USDC
  liquidity 127514729
TXID: [
  '4GSK2MuaJDoAjyC2AySYJ7hDYjaweQ2AnwKhz5CDC2Zm9mCNhU3xhCRAJeYz5Dj584KFDcuwNGLTHc3gp3EDgTZj'
]

*/
