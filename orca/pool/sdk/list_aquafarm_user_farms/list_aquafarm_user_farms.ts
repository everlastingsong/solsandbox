import { Connection } from "@solana/web3.js";
import { ORCA_FARM_ID } from '@orca-so/sdk';
import { orcaFarmConfigs } from "@orca-so/sdk/dist/constants/farms";
import { decodeUserFarmBuffer } from "@orca-so/aquafarm/dist/utils/layout";

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function main() {
  // bash$ export RPC_ENDPOINT_URL=<your-rpc-endpoint-url>
  const RPC_ENDPOINT_URL = process.env.RPC_ENDPOINT_URL;
  const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");

  const USER_FARM_LAYOUT_SIZE = 106;

  const first_n_farm_only = 5; // test only
  const farm_configs = Object.values(orcaFarmConfigs);
  for (let i=0; i<first_n_farm_only && i<farm_configs.length; i++) {
    await sleep(1*1000); // delay to avoid request burst to RPC
    const farm = farm_configs[i];

    const global_farm_address = farm.address;

    // find user farms
    // UserFarm layout: https://github.com/orca-so/aquafarm-sdk/blob/main/src/utils/layout.ts#L163
    // export const USER_FARM_DATA_LAYOUT = BufferLayout.struct([
    //   BufferLayout.u8("isInitialized"),
    //   BufferLayout.u8("accountType"),
    //   publicKey("globalFarm"),
    //   publicKey("owner"),
    //   uint64("baseTokensConverted"),
    //   uint256("cumulativeEmissionsCheckpoint"),
    // ]);
    const user_farms = await connection.getProgramAccounts(
      ORCA_FARM_ID,
      {filters: [
        {dataSize: USER_FARM_LAYOUT_SIZE},
        {memcmp: {bytes: global_farm_address.toBase58(), offset: 2}},
      ]});
    
    console.log(`global farm: ${global_farm_address.toBase58()}`);
    user_farms.map((uf) => {
      const user_farm = decodeUserFarmBuffer(uf.account);
      if (user_farm.baseTokensConverted.eqn(0)) return;
      console.log(`\tuserfarm: ${uf.pubkey.toBase58()}\towner: ${user_farm.owner.toBase58()}\tamount: ${user_farm.baseTokensConverted}`);
    })
  }
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/list_aquafarm_user_farms.ts
global farm: 85HrPbJtrN82aeB74WTwoFxcNgmf5aDNP2ENngbDpd5G
	userfarm: 8XAQa1Y9PkaxZ6nt7oxYDSBnVCnBNMzwsNPg4ca29bxJ	owner: CQC5hbG3tfktkKBoPKUyKEo1KCDKrNMHS6jTZbJK3KpW	amount: 1398312
	userfarm: E4xEy65Ke6nzznwCkXNS8GucdHfPUuUUy8N7yFDt7PGq	owner: ENbudKxrT5FBwUCzE2sTKn4KtfQQRvfzLw9cJfY8uQpF	amount: 919687
  ...
	userfarm: tr4nahS1zMX7faxPJ4ANYtUm8KG6tuavv1L6oRyf6RG	owner: Dy4zo8XdpzXb85AEGUDkeem9DMYgzZZSvWNVDd6dgVN5	amount: 50617293
	userfarm: DNGHGqmdKqceeXfwtUTdecBr7jZW1qZxgzrNYoYYFXMp	owner: GS5xymcA18QEsZVsRqADrBh1rQmt2gpQFQWeqJtLavHi	amount: 14484762
	userfarm: HmjgrKXGESX4tFu7gBfmBZKKNKC8auBwx93euDuwQqfs	owner: 3tabhB6thwMYjfAZbaVUeePXbcR9dZKWBnWAykS6q2aF	amount: 117793237

global farm: 4RRRJkscV2DmwJUxTQgRdYock75GfwYJn7LTxy9rGTmY
	userfarm: E6EyyvcCaar6DtHZdrhyxPU73bWeKkX9WMUZ3Vq1dR8N	owner: 7K9pk6AG919qVsu3zgpxyV3fm9nae7Em8GjqhUKr66Mv	amount: 2798407
	userfarm: GNz6WAPGPMCi3Am8JXDzt4QKFdEpYRBAi1RriEJipQDw	owner: NcHJo3sx8gDtJBcRKn3VCMcQJwbJN4MZPcowQycuH1u	amount: 2839615
  ...
	userfarm: FNyZHgizyiigHesvhmA2WqJk3p2FdpMJG49h6YHnMYdW	owner: 9LmE9xeAzvvMt83QBUydd6qLwcrASZCLHXKKXBHas6QM	amount: 138173515
	userfarm: Bdr6LioQQvF2HtMKuTN3Ryt6iiqhJe8F2VurwkUsQi5a	owner: 78T4z5Xybn9pYzAjHMztKFpy56XH9HjkttCy5JCfwKvF	amount: 11983833
	userfarm: 4aTTPyJv4pJTGjYd9Ty7Qsga9wskVdUBN3gk1HR6Smbi	owner: 2HbRYZhmRiAGGjnzdid4tY4DMirASkbTov4f8EJ6M2qm	amount: 11429115

global farm: 3ARgavt1NhqLmJWj3wAJy6XBarG6pJbEKRv1wzzRbbaN
	userfarm: ADD4MLq3ruiEiBRENfvtizDbrdn9NLGkCdnHMntAesCL	owner: 8mYBaYrbGqve8642DhpiQncAVb9RgtGiaeyCLnhmDsJS	amount: 1488369609
	userfarm: Hx4ZzXhD7nG3eE9LFGA8tUgRaFw4pHmRpC5Hq9HfoER7	owner: 3nSeVfvQLT6V2zDXavkqfgvYMaVFcrGnqojzyvhLQ6Rs	amount: 705126830
  ...
	userfarm: 4EZ7M5TNkWiArHL6ifMDWeWG7qyRywvstE42v7cLwWVX	owner: 5H54V4sqYsXtjXKkEsepT7zG7roHzUSG3qH9ZrYYjYZ8	amount: 301626124
	userfarm: 3M7BHoG1rK2u8WgjWCkAXtoWRGQaeWMhF4mSYRcpk2Lm	owner: 7wybrskSsUWcS8YY8kiZfDguW6ySJuQyJVNoge8ihFMP	amount: 315441590
	userfarm: 6apTKWyu9Xa6kpWPJ9zZQB9QXPZmpfyjVpntTZBCPKE2	owner: 4DENMYLy8cDRHhgxJKenP7xZH3yPTAmk7XQc2nujXVfi	amount: 92964965

*/