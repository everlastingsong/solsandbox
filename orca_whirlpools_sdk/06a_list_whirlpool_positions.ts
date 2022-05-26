import { PublicKey } from "@solana/web3.js";
import {
    WhirlpoolContext, AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PDAUtil, PriceMath,
} from "@orca-so/whirlpools-sdk";
import { Provider } from "@project-serum/anchor";
import { TokenUtil } from "@orca-so/common-sdk";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import assert from "assert";

// THIS SCRIPT REQUIRES ENVIRON VARS!!!
// bash$ export ANCHOR_PROVIDER_URL=https://ssc-dao.genesysgo.net
// bash$ export ANCHOR_WALLET=~/.config/solana/id.json
// bash$ ts-node this_script.ts

// ATTENTION!!!
// the version of whirlpools-sdk shold be >= 0.1.6
// this script use getTokenBInfo(), and its bug have been fixed in v0.1.6.

const provider = Provider.env();
console.log("connection endpoint", provider.connection.rpcEndpoint);
console.log("wallet", provider.wallet.publicKey.toBase58());

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
    return pda.publicKey
  });

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
  const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
  const fetcher = new AccountFetcher(ctx.connection);
  const client = buildWhirlpoolClient(ctx, fetcher);

  // get position pubkeys
  const positions = await get_whirlpool_position_pubkeys(ctx, fetcher, ctx.wallet.publicKey);

  // print position info
  for (let i=0; i < positions.length; i++ ) {
    const p = positions[i];
    const position = await client.getPosition(p);
    const data = position.getData();
    const pool = await client.getPool(data.whirlpool);
    const token_a = pool.getTokenAInfo();
    const token_b = pool.getTokenBInfo();

    // verify the SDK version (>= 0.1.6)
    assert(token_a.mint.toBase58() !== token_b.mint.toBase58());

    console.log("position", i, p.toBase58());
    console.log("\twhirlpool address", data.whirlpool.toBase58());
    console.log("\ttokenA", token_a.mint.toBase58());
    console.log("\ttokenB", token_b.mint.toBase58());
    console.log("\tliquidity", data.liquidity.toString());
    console.log("\tlower", data.tickLowerIndex, PriceMath.tickIndexToPrice(data.tickLowerIndex, token_a.decimals, token_b.decimals).toFixed(token_b.decimals));
    console.log("\tupper", data.tickUpperIndex, PriceMath.tickIndexToPrice(data.tickUpperIndex, token_a.decimals, token_b.decimals).toFixed(token_b.decimals));
  }
}

main();

/*
SAMPLE OUTPUT

$ ts-node 06a_list_whirlpool_positions.ts 
connection endpoint https://ssc-dao.genesysgo.net
wallet r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
position 0 4bwWbT1xgPC1vC245XFcV4HKobc9Kxaau7yH6TGG7S5D
        whirlpool address HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
        tokenA So11111111111111111111111111111111111111112
        tokenB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
        liquidity 7309503
        lower -36864 25.066682
        upper -22976 100.511299
position 1 95fV2Vwf8BeekxKToKFdc3dJ6jCdYnrF36ibJU4yztst
        whirlpool address HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
        tokenA So11111111111111111111111111111111111111112
        tokenB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
        liquidity 7330773
        lower -36864 25.066682
        upper -22976 100.511299
position 2 3dX6SdHNTQwj27f1fm79DjnZD1wjE1AvsW16mAz7UzFY
        whirlpool address HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
        tokenA So11111111111111111111111111111111111111112
        tokenB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
        liquidity 146266273
        lower -25792 75.844427
        upper -25088 81.376026
position 3 3LWvK4W5YhgPybw881WxPj9a33mQu9yYJ4vDtrxYYKeF
        whirlpool address HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
        tokenA So11111111111111111111111111111111111111112
        tokenB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
        liquidity 127514729
        lower -25792 75.844427
        upper -25088 81.376026
position 4 9UP6D8rR9BVbVDqUkG8wkz9eZVBh69huKraaHehJyH3Z
        whirlpool address HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
        tokenA So11111111111111111111111111111111111111112
        tokenB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
        liquidity 7376472
        lower -36864 25.066682
        upper -22976 100.511299
position 5 4C5A5TsSZrmoPiptbfqqDjK4LsBcFbuJG76MDja6U3VV
        whirlpool address HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
        tokenA So11111111111111111111111111111111111111112
        tokenB EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
        liquidity 141154010
        lower -25792 75.844427
        upper -25088 81.376026

*/
