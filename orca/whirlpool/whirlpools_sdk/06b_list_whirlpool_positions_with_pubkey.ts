import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import {
    WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PDAUtil, PriceMath, PoolUtil,
} from "@orca-so/whirlpools-sdk";
import { BN, Wallet } from "@project-serum/anchor";
import { TokenUtil, DecimalUtil } from "@orca-so/common-sdk";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";


const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net"

// set your public key
const WALLET_PUBKEY = new PublicKey("r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6");


// reference: https://orca-so.gitbook.io/orca-developer-portal/whirlpools/interacting-with-the-protocol/position-management/identifying-whirlpool-tokens
async function get_whirlpool_position_pubkeys(
  ctx: WhirlpoolContext,
  fetcher: AccountFetcher,
  position_owner: PublicKey,
  filter_whirlpool_pubkey: PublicKey = null
): Promise<PublicKey[]> {
  // get all token accounts
  const token_accounts = (await ctx.connection.getTokenAccountsByOwner(position_owner, {programId: TOKEN_PROGRAM_ID})).value;

  // get position PDA from mint
  const whirlpool_position_candidate_pubkeys = token_accounts.map((ta) => {
    const parsed = TokenUtil.deserializeTokenAccount(ta.account.data);
    const pda = PDAUtil.getPosition(ctx.program.programId, parsed.mint);
    // amount == 1 check
    return (parsed.amount as BN).eq(new BN(1)) ? pda.publicKey : undefined;
  }).filter(pubkey => pubkey !== undefined);

  // check position PDA existance
  const whirlpool_position_candidate_datas = await fetcher.listPositions(whirlpool_position_candidate_pubkeys, true);
  const whirlpool_positions = whirlpool_position_candidate_pubkeys.filter((pubkey, i) => 
    whirlpool_position_candidate_datas[i] !== null
    // filter for a specific whirlpool if passed
    && (filter_whirlpool_pubkey === null || whirlpool_position_candidate_datas[i].whirlpool.toBase58() === filter_whirlpool_pubkey.toBase58())
  );

  return whirlpool_positions;
}

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");
  const wallet = new Wallet(Keypair.generate()); // dummy
  
  const ctx = WhirlpoolContext.from(connection, wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const fetcher = new AccountFetcher(ctx.connection);
  const client = buildWhirlpoolClient(ctx);
  
  console.log("connection endpoint", ctx.connection.rpcEndpoint);
  console.log("wallet", WALLET_PUBKEY.toBase58());
  
  // get position pubkeys
  const positions = await get_whirlpool_position_pubkeys(ctx, fetcher, WALLET_PUBKEY);

  // print position info
  for (let i=0; i < positions.length; i++ ) {
    const p = positions[i];
    const position = await client.getPosition(p);
    const data = position.getData();
    const pool = await client.getPool(data.whirlpool);
    const token_a = pool.getTokenAInfo();
    const token_b = pool.getTokenBInfo();
    const lower_price = PriceMath.tickIndexToPrice(data.tickLowerIndex, token_a.decimals, token_b.decimals);
    const upper_price = PriceMath.tickIndexToPrice(data.tickUpperIndex, token_a.decimals, token_b.decimals);
    const amounts = PoolUtil.getTokenAmountsFromLiquidity(
      data.liquidity,
      pool.getData().sqrtPrice,
      PriceMath.tickIndexToSqrtPriceX64(data.tickLowerIndex),
      PriceMath.tickIndexToSqrtPriceX64(data.tickUpperIndex),
      true
    );

    console.log("position", i, p.toBase58());
    console.log("\twhirlpool address", data.whirlpool.toBase58());
    console.log("\ttokenA", token_a.mint.toBase58());
    console.log("\ttokenB", token_b.mint.toBase58());
    console.log("\tliquidity", data.liquidity.toString());
    console.log("\tlower", data.tickLowerIndex, lower_price.toFixed(token_b.decimals));
    console.log("\tupper", data.tickUpperIndex, upper_price.toFixed(token_b.decimals));
    console.log("\tamountA", DecimalUtil.fromU64(amounts.tokenA, token_a.decimals).toString());
    console.log("\tamountB", DecimalUtil.fromU64(amounts.tokenB, token_b.decimals).toString());
  }
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/06b_list_whirlpool_positions_with_pubkey.ts 
connection endpoint https://ssc-dao.genesysgo.net
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
position 0 4bwWbT1xgPC1vC245XFcV4HKobc9Kxaau7yH6TGG7S5D
        whirlpool address HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
        tokenA So11111111111111111111111111111111111111112
        tokenB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
        liquidity 7309503
        lower -36864 25.066682
        upper -22976 100.511299
        amountA 0.012127326
        amountB 0.361318
position 1 88hXrRdXuHFCWm41S6yyeW7QWSeVbgmHL4ja2iHUumip
        whirlpool address 4fuUiYxTQ6QCrdSq9ouBYcTM7bqSwYTSyLueGZLTy4T4
        tokenA EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
        tokenB Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
        liquidity 3721347
        lower -41 0.995908
        upper 52 1.005213
        amountA 0.010243
        amountB 0.007041
position 2 2PY6PwqcoRw62rQgn82LtcWCDT9r98CSq6vrwujYjjSP
        whirlpool address HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
        tokenA So11111111111111111111111111111111111111112
        tokenB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
        liquidity 5624201
        lower -33152 36.332804
        upper -30080 49.397789
        amountA 0.00176616
        amountB 0.096423
position 3 9FwHiJ9KLbhRVoSDdpyJfnhsraPwyS9nWMUcnYawqHvy
        whirlpool address 99NGdDEUbCrXdrhsrW63jRUAtYSRC8zme2TXeE82jTmC
        tokenA So11111111111111111111111111111111111111112
        tokenB AG5j4hhrd1ReYi7d1JsZL8ZpcoHdjXvc8sdpWF74RaQh
        liquidity 2944819
        lower -25088 0.81376026
        upper -20608 1.27365169
        amountA 0
        amountB 0.00210902
position 4 9UP6D8rR9BVbVDqUkG8wkz9eZVBh69huKraaHehJyH3Z
        whirlpool address HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
        tokenA So11111111111111111111111111111111111111112
        tokenB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
        liquidity 6638825
        lower -36864 25.066682
        upper -22976 100.511299
        amountA 0.011014592
        amountB 0.328166
position 5 EySqej5z5VdfZ9TUEL84NrcPowTE2iWPaapG31iU8pzW
        whirlpool address HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
        tokenA So11111111111111111111111111111111111111112
        tokenB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
        liquidity 72874235
        lower -25856 75.360596
        upper -25088 81.376026
        amountA 0.01
        amountB 0
position 6 4C5A5TsSZrmoPiptbfqqDjK4LsBcFbuJG76MDja6U3VV
        whirlpool address HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
        tokenA So11111111111111111111111111111111111111112
        tokenB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
        liquidity 141154010
        lower -25792 75.844427
        upper -25088 81.376026
        amountA 0.01772685
        amountB 0
position 7 Frpe9FB5NeyzUyt7cinB93RBwJ3zwkwGEF7XfgkymhD
        whirlpool address HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
        tokenA So11111111111111111111111111111111111111112
        tokenB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
        liquidity 72874235
        lower -25856 75.360596
        upper -25088 81.376026
        amountA 0.01
        amountB 0
position 8 2QZkhxUZJZCZUZ962TX4LjaoRsEejVQQ4UeH9RQGHBRK
        whirlpool address HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
        tokenA So11111111111111111111111111111111111111112
        tokenB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
        liquidity 7391130
        lower -36864 25.066682
        upper -25856 75.360596
        amountA 0.008652092
        amountB 0.365353
position 9 95fV2Vwf8BeekxKToKFdc3dJ6jCdYnrF36ibJU4yztst
        whirlpool address HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
        tokenA So11111111111111111111111111111111111111112
        tokenB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
        liquidity 7330773
        lower -36864 25.066682
        upper -22976 100.511299
        amountA 0.012162615
        amountB 0.36237
position 10 Hp6ucWuMaFVLdV25EzgaHVkM8aCS6VgpYE5Lsi2LcwsC
        whirlpool address 64SUepq75CUbbmKKvh3begwTYkmosyEZUVGC1sCziovt
        tokenA UXPhBoR3qG4UCiGNJfV7MqhHyFqKN68g45GoYvAeL2M
        tokenB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
        liquidity 76461522
        lower -161152 0.000100
        upper -154240 0.000200
        amountA 0
        amountB 0.01
position 11 B66pRzGcKMmxRJ16KMkJMJoQWWhmyk4na4DPcv6X5ZRD
        whirlpool address 9vqYJjDUFecLL2xPUC4Rc7hyCtZ6iJ4mDiVZX7aFXoAe
        tokenA 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
        tokenB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
        liquidity 2104818075
        lower -112320 0.013250
        upper -110016 0.016684
        amountA 15.702315442
        amountB 0.681224
position 12 5j3szbi2vnydYoyALNgttPD9YhCNwshUGkhzmzaP4WF7
        whirlpool address HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
        tokenA So11111111111111111111111111111111111111112
        tokenB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
        liquidity 50496375
        lower -33472 35.188616
        upper -30976 45.164444
        amountA 0.005447874
        amountB 1.018491

*/