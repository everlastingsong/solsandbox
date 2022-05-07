import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Provider, Wallet, BN } from "@project-serum/anchor";
import { OrcaWhirlpoolClient, OrcaNetwork, Percentage } from "@orca-so/whirlpool-sdk";
import { solToken, orcaToken, usdcToken } from "@orca-so/sdk/dist/constants/tokens";
import Decimal from "decimal.js";
import { OrcaU64 } from "@orca-so/sdk";
import { u64 } from "@solana/spl-token";

const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net";
const commitment = 'confirmed';
const connection = new Connection(RPC_ENDPOINT_URL, commitment);

const provider = new Provider(connection, new Wallet(new Keypair() /* DUMMY */), Provider.defaultOptions());

function to_scaled(amount: BN, scale: number): string {
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

/*
OUTPUT SAMPLE:

$ ts-node get_whirlpool_swap_quote.ts
{
  poolAddress: PublicKey {
    _bn: <BN: 43a7185e6c1dc5a9f6ed1cc23574d648f732c8425af30d1d169487f27c2a0e3e>
  },
  otherAmountThreshold: <BN: 187f60>,
  sqrtPriceLimitX64: <BN: 100013b50>,
  amountIn: <BN: f4240>,
  amountOut: <BN: 1885a6>,
  aToB: true,
  fixedInput: true
}
amountIn:  1.000000  ORCA
amountOut:  1.607078  USDC
other:  1605472
*/
