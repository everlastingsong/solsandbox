import { WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient, swapQuoteByInputToken } from "@orca-so/whirlpools-sdk";
import { AnchorProvider, Wallet } from "@project-serum/anchor";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { Percentage, DecimalUtil } from "@orca-so/common-sdk";
import Decimal from "decimal.js";

async function main() {
  // bash$ export ANCHOR_PROVIDER_URL=https://rpc.ankr.com/solana
  // bash$ export ANCHOR_WALLET=~/.config/solana/id.json
  // const provider = AnchorProvider.env();

  // setup client
  const RPC = "https://rpc.ankr.com/solana";
  const connection = new Connection(RPC, "confirmed");
  const dummyWallet = new Wallet(Keypair.generate());
  const provider = new AnchorProvider(connection, dummyWallet, AnchorProvider.defaultOptions());

  console.log("connection endpoint", provider.connection.rpcEndpoint);
  console.log("wallet", provider.wallet.publicKey.toBase58());

  const ctx = WhirlpoolContext.from(provider.connection, provider.wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const client = buildWhirlpoolClient(ctx);

  // get SOL/JITOSOL pool & token info(including decimals)
  const SOL_JITOSOL_1 = new PublicKey("Hp53XEtt4S8SvPCXarsLSdGfZBuUr5mMmZmX2DRNXQKp");
  const pool = await client.getPool(SOL_JITOSOL_1);
  const sol = pool.getTokenAInfo();
  const jitosol = pool.getTokenBInfo();
  console.log("decimals of SOL", sol.decimals);
  console.log("decimals of JITOSOL", jitosol.decimals);

  // get Quote: input is 1 SOL
  const input = new Decimal("1"); // Decimal is for UI notation
  const inputU64 = DecimalUtil.toU64(input, sol.decimals); // u64 is internal representation
  console.log("input & inputU64", input.toString(), inputU64.toString());

  const acceptableSlippage = Percentage.fromFraction(1, 100); // 1%

  const quote = await swapQuoteByInputToken(
    pool,
    sol.mint, // input is SOL
    inputU64,
    acceptableSlippage,
    ORCA_WHIRLPOOL_PROGRAM_ID,
    ctx.fetcher,
    true, // refresh
  );

  const estimatedAmountInU64 = quote.estimatedAmountIn;
  const estimatedAmountOutU64 = quote.estimatedAmountOut;
  const estimatedAmountInDecimal = DecimalUtil.fromU64(estimatedAmountInU64, sol.decimals);
  const estimatedAmountOutDecimal = DecimalUtil.fromU64(estimatedAmountOutU64, jitosol.decimals);

  console.log("estimatedAmountIn U64 & Decimal", estimatedAmountInU64.toString(), estimatedAmountInDecimal.toString());
  console.log("estimatedAmountOut U64 & Decimal", estimatedAmountOutU64.toString(), estimatedAmountOutDecimal.toString());
}

main();

/*

SAMPLE OUTPUT:

$ ts-node src/13a_decimals.ts 
connection endpoint https://rpc.ankr.com/solana
wallet GPJQVWgak7HzB7jmfLjYBgLXJL8bGThC7FqfqKWGVJjr
decimals of SOL 9
decimals of JITOSOL 9
input & inputU64 1 1000000000
estimatedAmountIn U64 & Decimal 1000000000 1
estimatedAmountOut U64 & Decimal 984963626 0.984963626

*/