const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const { Provider, Wallet, BN } = require("@project-serum/anchor");
const { OrcaWhirlpoolClient, OrcaNetwork, Percentage } = require("@orca-so/whirlpool-sdk");
const { solToken, orcaToken, usdcToken } = require("@orca-so/sdk/dist/constants/tokens");
const Decimal = require("decimal.js");
const { OrcaU64 } = require("@orca-so/sdk");
const { u64 } = require("@solana/spl-token");

const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net";
const commitment = 'confirmed';
const connection = new Connection(RPC_ENDPOINT_URL, commitment);

const provider = new Provider(connection, new Wallet(new Keypair() /* DUMMY */), Provider.defaultOptions());

function to_scaled(amount, scale) {
  const pow10 = new Decimal(10).pow(scale);
  return new Decimal(amount.toString()).div(pow10).toFixed(scale);
}

async function main() {
  // Derive the Whirlpool address from token mints
  const orca = new OrcaWhirlpoolClient({ network: OrcaNetwork.MAINNET });
  const poolAddress = await orca.pool.derivePDA(orcaToken.mint, usdcToken.mint, 64).publicKey;

  // Fetch an instance of the pool
  const poolData = await orca.getPool(poolAddress);
  if (!poolData) {
    return;
  }

  const quote = await orca.pool.getSwapQuote({
    poolAddress: poolAddress,
    tokenMint: orcaToken.mint,
    tokenAmount: OrcaU64.fromNumber(1, orcaToken.scale).toU64(), /* 1 ORCA */
    isInput: true,
    refresh: true,
    slippageTolerance: Percentage.fromDecimal(new Decimal(0.1 /* % */) )
  });

  console.log(quote);
  console.log("amountIn: ", to_scaled(quote.amountIn, orcaToken.scale), " ORCA");
  console.log("amountOut: ", to_scaled(quote.amountOut, usdcToken.scale), " USDC");
  console.log("other: ", quote.otherAmountThreshold.toString());
}

main();
