import { Connection } from "@solana/web3.js";
import {
  AccountFetcher,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  ORCA_WHIRLPOOLS_CONFIG,
} from "@orca-so/whirlpools-sdk";


async function main() {
  const RPC_ENDPOINT_SOLANA_PUBLIC = "https://api.mainnet-beta.solana.com";
  const RPC_ENDPOINT_ANKER_PUBLIC = "https://rpc.ankr.com/solana";

  //const connection = new Connection(RPC_ENDPOINT_SOLANA_PUBLIC);
  // Error: 410 Gone:  {"jsonrpc":"2.0","error":{"code": 410, "message":"The RPC call or parameters have been disabled."}, "id": "371a5862-c898-44b1-a895-e2721ee8ad95" } 
  // getProgramAccounts disabled...(T-T)
  // note: its high cost operation...

  // Thanks ANKER!
  const connection = new Connection(RPC_ENDPOINT_ANKER_PUBLIC);

  const acountFetcher = new AccountFetcher(connection);
    const poolsList = await acountFetcher.listPoolsWithParams({
      configId: ORCA_WHIRLPOOLS_CONFIG,
      programId: ORCA_WHIRLPOOL_PROGRAM_ID,
  });
  console.log("poolsList", poolsList);
}

main();

/*
...
[
  PublicKey {
    _bn: <BN: 272cc2176dc821033d28126d38e2afa4daa82d826a2ce146fd6aeffadb733a14>
  },
  {
    whirlpoolsConfig: [PublicKey],
    whirlpoolBump: [Array],
    tickSpacing: 64,
    tickSpacingSeed: [Array],
    feeRate: 3000,
    protocolFeeRate: 300,
    liquidity: <BN: c1bd607c64>,
    sqrtPrice: <BN: 216545c8b64ad9f>,
    tickCurrentIndex: -96192,
    protocolFeeOwedA: <BN: 4298af8df2>,
    protocolFeeOwedB: <BN: 1d39946>,
    tokenMintA: [PublicKey],
    tokenVaultA: [PublicKey],
    feeGrowthGlobalA: <BN: d3c89194b99ebe3ad>,
    tokenMintB: [PublicKey],
    tokenVaultB: [PublicKey],
    feeGrowthGlobalB: <BN: 5932fa3ec48bdb>,
    rewardLastUpdatedTimestamp: <BN: 63c5f9de>,
    rewardInfos: [Array]
  }
],
... 372 more items

*/
