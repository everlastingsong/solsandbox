import { Commitment, Connection, PublicKey } from "@solana/web3.js";

const RPC_CALLS_PER_ITERATION = 3;
const NUM_ITERATION = 10;
const RPC_CALL_DELAY = 100; // ms
const ITERATION_DELAY = 1000; // ms

const TARGET_PUBKEY = new PublicKey("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ"); // Orca Whirlpool address of SOL/USDC

async function delay(ms) { await new Promise(resolve => setTimeout(resolve, ms)); }

async function test_cluster_consistency(cluster_name: string, connection: Connection, commitment: Commitment) {
  console.log("test_cluster_consistency with", cluster_name, "commitment = ", commitment);

  let previous_slot = 0;
  for (let i=0; i<NUM_ITERATION; i++) {
    for (let c=0; c<RPC_CALLS_PER_ITERATION; c++) {
      const res = await connection.getAccountInfoAndContext(TARGET_PUBKEY);
      const slot = res.context.slot;

      const mark = slot < previous_slot ? "*back*" : "";
      console.log(`  ${i}:${c}: slot ${slot} ${mark}`);

      previous_slot = slot;
      await delay(RPC_CALL_DELAY);
    }

    await delay(ITERATION_DELAY);
  }
}


async function main() {
  const RPC_ENDPOINT_URL_GENGO  = "https://ssc-dao.genesysgo.net";
  const RPC_ENDPOINT_URL_SOLANA = "https://api.mainnet-beta.solana.com";
  const RPC_ENDPOINT_URL_SERUM  = "https://solana-api.projectserum.com";
  const commitment = 'confirmed';

  await test_cluster_consistency("GenesysGo", new Connection(RPC_ENDPOINT_URL_GENGO, commitment), commitment);
  await test_cluster_consistency("Solana", new Connection(RPC_ENDPOINT_URL_SOLANA, commitment), commitment);
  await test_cluster_consistency("Serum", new Connection(RPC_ENDPOINT_URL_SERUM, commitment), commitment);
}

main();

/*

$ ts-node src/test_consistency_of_rpc_cluster.ts 
test_cluster_consistency with GenesysGo commitment =  confirmed
  0:0: slot 135448891 
  0:1: slot 135448891 
  0:2: slot 135448891 
  1:0: slot 135448895 
  1:1: slot 135448895 
  1:2: slot 135448895 
  2:0: slot 135448897 
  2:1: slot 135448898 
  2:2: slot 135448898 
  3:0: slot 135448899 
  3:1: slot 135448899 
  3:2: slot 135448901 
  4:0: slot 135448901 
  4:1: slot 135448903 
  4:2: slot 135448899 *back*
  5:0: slot 135448903 
  5:1: slot 135448903 
  5:2: slot 135448903 
  6:0: slot 135448904 
  6:1: slot 135448905 
  6:2: slot 135448905 
  7:0: slot 135448907 
  7:1: slot 135448909 
  7:2: slot 135448907 *back*
  8:0: slot 135448910 
  8:1: slot 135448911 
  8:2: slot 135448911 
  9:0: slot 135448913 
  9:1: slot 135448913 
  9:2: slot 135448913 
test_cluster_consistency with Solana commitment =  confirmed
  0:0: slot 135448916 
  0:1: slot 135448916 
  0:2: slot 135448916 
  1:0: slot 135448920 
  1:1: slot 135448921 
  1:2: slot 135448921 
  2:0: slot 135448922 
  2:1: slot 135448923 
  2:2: slot 135448923 
  3:0: slot 135448924 
  3:1: slot 135448924 
  3:2: slot 135448925 
  4:0: slot 135448925 
  4:1: slot 135448925 
  4:2: slot 135448925 
  5:0: slot 135448927 
  5:1: slot 135448927 
  5:2: slot 135448927 
  6:0: slot 135448928 
  6:1: slot 135448928 
  6:2: slot 135448928 
  7:0: slot 135448928 
  7:1: slot 135448928 
  7:2: slot 135448928 
  8:0: slot 135448929 
  8:1: slot 135448929 
  8:2: slot 135448929 
  9:0: slot 135448941 
  9:1: slot 135448941 
  9:2: slot 135448941 
test_cluster_consistency with Serum commitment =  confirmed
  0:0: slot 135448943 
  0:1: slot 135448943 
  0:2: slot 135448943 
  1:0: slot 135448943 
  1:1: slot 135448943 
  1:2: slot 135448943 
  2:0: slot 135448943 
  2:1: slot 135448943 
  2:2: slot 135448943 
  3:0: slot 135448953 
  3:1: slot 135448954 
  3:2: slot 135448954 
  4:0: slot 135448956 
  4:1: slot 135448956 
  4:2: slot 135448958 
  5:0: slot 135448959 
  5:1: slot 135448959 
  5:2: slot 135448959 
  6:0: slot 135448963 
  6:1: slot 135448963 
  6:2: slot 135448965 
  7:0: slot 135448966 
  7:1: slot 135448966 
  7:2: slot 135448966 
  8:0: slot 135448966 
  8:1: slot 135448966 
  8:2: slot 135448966 
  9:0: slot 135448975 
  9:1: slot 135448975 
  9:2: slot 135448975 

*/
