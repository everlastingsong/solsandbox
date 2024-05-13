import { ORCA_WHIRLPOOLS_CONFIG } from "@orca-so/whirlpools-sdk";
import { PublicKey } from "@solana/web3.js";
import { gql, GraphQLClient } from "graphql-request";

//
// requirements
// export SHIFT_API_KEY=<your api key>
//
// You can get your api key from https://shyft.to/ (api key is same for RPC endpoint)
//

async function main() {
  const SHYFT_API_KEY = process.env.SHYFT_API_KEY;
  if (!SHYFT_API_KEY) {
    throw new Error("SHYFT_API_KEY is not set");
  }

  // create client
  const endpoint = `https://programs.shyft.to/v0/graphql/?api_key=${SHYFT_API_KEY}`;
  const graphQLClient = new GraphQLClient(endpoint, {
    method: `POST`,
    jsonSerializer: {
      parse: JSON.parse,
      stringify: JSON.stringify,
    },
  });

  const SAMO_MINT_ADDRESS = new PublicKey("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");

  // QUERY
  // You can build queries using Hasura: https://docs.shyft.to/solana-indexers/instant-graphql-apis/getting-started
  const listWhirlpoolQuery = gql`
    query FindWhirlpoolQuery(
      $where: ORCA_WHIRLPOOLS_whirlpool_bool_exp
      $limit: Int
      $offset: Int
    ) {
      ORCA_WHIRLPOOLS_whirlpool(
        limit: $limit
        offset: $offset
        where: $where
      ) {
        pubkey
        whirlpoolsConfig
        tokenMintA
        tokenMintB
        tickSpacing
      }
    }
  `;

  // find whirlpool
  // pagination: limit=1000, offset=0
  const variables = {
    where: {
      whirlpoolsConfig: {_eq: ORCA_WHIRLPOOLS_CONFIG.toBase58()},
      _or: [
        { tokenMintA: {_eq: SAMO_MINT_ADDRESS.toBase58()} },
        { tokenMintB: {_eq: SAMO_MINT_ADDRESS.toBase58()} },
      ],
    },
    limit: 1000,
    offset: 0,
  };

  // @ts-ignore
  const list = await graphQLClient.request(listWhirlpoolQuery, variables) as any;

  console.log(list);
  console.log(list.ORCA_WHIRLPOOLS_whirlpool.length)
}

main();

/*

SAMPLE OUTPUT:

{
  ORCA_WHIRLPOOLS_whirlpool: [
    {
      pubkey: 'C3hBSaQ1VAnLBb4xLFieQeFJH8mqKhUD8BDuhSqcxUsX',
      whirlpoolsConfig: '2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ',
      tokenMintA: 'poLisWXnNRwC6oBu1vHiuKQzFjGL4XDSu4g9qjz9qVk',
      tokenMintB: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      tickSpacing: 128
    },
    {
      pubkey: '6UaowxajAxGEL68EvuYzN4y1sYD5YkhRjrNHSAFtDJjs',
      whirlpoolsConfig: '2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ',
      tokenMintA: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      tokenMintB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      tickSpacing: 8
    },
    ...
    {
      pubkey: 'DpmWxsGtJoe9r5JjYT5XWN5ZDBW54echsfQBt54WEi9m',
      whirlpoolsConfig: '2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ',
      tokenMintA: 'USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX',
      tokenMintB: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      tickSpacing: 64
    }
  ]
}
27

*/
