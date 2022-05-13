import { OrcaWhirlpoolClient, OrcaNetwork } from "@orca-so/whirlpool-sdk";

async function main() {
  // Derive the Whirlpool address from token mints
  const orca = new OrcaWhirlpoolClient({ network: OrcaNetwork.MAINNET });
  
  const pools = await orca.offchain.getPools()
  const tokens = await orca.offchain.getTokens();

  console.log("---------- TOKENS --------------");
  console.log(tokens);

  console.log("---------- POOLS --------------");
  console.log(pools);

  console.log("---------- SPECIFIC TOKEN --------------");
  const usdcToken = Object.values(tokens).find((t) => t.coingeckoId === "usd-coin"); // or t.symbol === "USDC"
  console.log(usdcToken);
}

main();
