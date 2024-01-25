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

  // QUERY
  // You can build queries using Hasura: https://docs.shyft.to/solana-indexers/instant-graphql-apis/getting-started
  const query = gql`
    query FindNonZeroLiqPositionQuery(
      $where: ORCA_WHIRLPOOLS_position_bool_exp
      $orderBy: [ORCA_WHIRLPOOLS_position_order_by!]
      $limit: Int
      $offset: Int
    ) {
      ORCA_WHIRLPOOLS_position(
        limit: $limit
        offset: $offset
        order_by: $orderBy
        where: $where
      ) {
        _lamports
        feeGrowthCheckpointA
        feeGrowthCheckpointB
        feeOwedA
        feeOwedB
        liquidity
        positionMint
        tickLowerIndex
        tickUpperIndex
        whirlpool
        pubkey
      }
    }
  `;

  // find positions with non-zero liquidity
  // pool: ORCA/USDC(ts=64) 5Z66YYYaTmmx1R4mATAGLSc8aV4Vfy5tNdJQzk1GP9RF
  // sort: liquidity desc
  // pagination: limit=20, offset=0
  const variables = {
    where: {liquidity: {_gt: "0"}, whirlpool: {_eq: "5Z66YYYaTmmx1R4mATAGLSc8aV4Vfy5tNdJQzk1GP9RF"}},
    orderBy: {liquidity: "desc"},
    limit: 5,
    offset: 0,
  };

  // @ts-ignore
  const result = await graphQLClient.request(query, variables);

  console.log(result);
}

main();

/*

SAMPLE OUTPUT:

$ ts-node src/15a_list_whirlpool_positions_with_shyft_graphql.ts 
{
  ORCA_WHIRLPOOLS_position: [
    {
      _lamports: 2394240,
      feeGrowthCheckpointA: 199252321159313380,
      feeGrowthCheckpointB: 1334492062725660000,
      feeOwedA: 0,
      feeOwedB: 0,
      liquidity: 58732751234,
      positionMint: '2ZesTmuCPNbNUZUYEonWJFmDRNK2Jeb73g2DJJ7mnjkL',
      tickLowerIndex: 16064,
      tickUpperIndex: 17216,
      whirlpool: '5Z66YYYaTmmx1R4mATAGLSc8aV4Vfy5tNdJQzk1GP9RF',
      pubkey: '2MkMskDA2y6RnQ81Hz7N4NfpnrRYyGHj6J3LCgYzwbTz'
    },
    {
      _lamports: 2394240,
      feeGrowthCheckpointA: 178703430086985150,
      feeGrowthCheckpointB: 151719954102246180,
      feeOwedA: 0,
      feeOwedB: 0,
      liquidity: 22410849415,
      positionMint: '6z8135ZriTChdkxEWqNZAr6aJeNULrkTGYbDW5N94HGh',
      tickLowerIndex: -2752,
      tickUpperIndex: -512,
      whirlpool: '5Z66YYYaTmmx1R4mATAGLSc8aV4Vfy5tNdJQzk1GP9RF',
      pubkey: 'E9VBFFRZikEq6TmFQfTVXbJVMr7ofTJT58ndJMzpt2DB'
    },
    {
      _lamports: 2394240,
      feeGrowthCheckpointA: 7067570951195804,
      feeGrowthCheckpointB: 14343961390566416,
      feeOwedA: 0,
      feeOwedB: 0,
      liquidity: 14564975311,
      positionMint: 'Ea1Znc5Y7DTeCxqY3BryHEm3koqT5rnjoQp4FRE2hCyo',
      tickLowerIndex: 5376,
      tickUpperIndex: 7616,
      whirlpool: '5Z66YYYaTmmx1R4mATAGLSc8aV4Vfy5tNdJQzk1GP9RF',
      pubkey: '2c2YyTtFXBmTZTXSiMjhC4SCmzV57o7djviWpH1G5fPd'
    },
    {
      _lamports: 2394240,
      feeGrowthCheckpointA: 149054063785283780,
      feeGrowthCheckpointB: 123058309797976530,
      feeOwedA: 0,
      feeOwedB: 0,
      liquidity: 13125169536,
      positionMint: 'B8EvmPX9gSTRRDJe7jsjAQFZn6o7GpaY781TKjtWUjRK',
      tickLowerIndex: -443584,
      tickUpperIndex: 443584,
      whirlpool: '5Z66YYYaTmmx1R4mATAGLSc8aV4Vfy5tNdJQzk1GP9RF',
      pubkey: 'HbTqALWE4t62saNvhBXWV7WpBUhVECj9DXj1pYGKWazR'
    },
    {
      _lamports: 2394240,
      feeGrowthCheckpointA: 974595773393314300,
      feeGrowthCheckpointB: 2491750090453280000,
      feeOwedA: 0,
      feeOwedB: 57619,
      liquidity: 11593992811,
      positionMint: 'B7x3Uw8usSknGXFBfHDHETBQPzovEdXRBbSkaVzbeGHi',
      tickLowerIndex: -443584,
      tickUpperIndex: 443584,
      whirlpool: '5Z66YYYaTmmx1R4mATAGLSc8aV4Vfy5tNdJQzk1GP9RF',
      pubkey: 'HjzboWuM47zMK3xY7pP4dsT1paqKXPrrjQGsRe6pRu2H'
    }
  ]
}

*/