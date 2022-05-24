import { Connection, AccountInfo, KeyedAccountInfo, DataSizeFilter, MemcmpFilter, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, AccountLayout } from '@solana/spl-token';

const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net";

function token_account_listener(keyed_account_info: KeyedAccountInfo) {
  console.log("change detected", keyed_account_info.accountId.toBase58());
}

async function main() {
  // conservative setting
  const commitment = 'processed';
  const connection = new Connection(RPC_ENDPOINT_URL, { commitment: commitment });

  const TARGET_TOKEN_MINT = new PublicKey("SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y");

  const size_filter: DataSizeFilter = { dataSize: AccountLayout.span };
  const memcmp_filter : MemcmpFilter = { memcmp: {offset: 0 /* start of mint field */, bytes: TARGET_TOKEN_MINT.toBase58() }};
  const filters = [size_filter, memcmp_filter];

  // register listners (to detect change of SOL/USDC pool)
  console.log("start listening...");
  const token_account_listener_id = connection.onProgramAccountChange(TOKEN_PROGRAM_ID, token_account_listener, commitment, filters);

  // sleep...
  const sleep_sec = 10;
  await new Promise(resolve => setTimeout(resolve, sleep_sec*1000));

  // unregister listeners
  console.log("stop listening...");
  connection.removeProgramAccountChangeListener(token_account_listener_id);
}

main();

/*
OUTPUT SAMPLE:

$ ts-node src/monitor_all_shdw_token_accounts.ts
start listening...
change detected 8ZVaNyNZQkcMzF7esuZoRgRo7Rc9eKEN18v4zw7Ng8JZ
change detected EtFcFogovBJsXKuN5qPemF7U4RBdvzVmSLUzvXdU5PX6
change detected 4AHRR7uSboC1eMY18CxB1r6vtv5mkPVX53ieCQGqJM58
change detected F3cScQ9u1EGLVGJwuHWxT5RG2ivQFTxLvPqRwjnKxAU6
change detected F3cScQ9u1EGLVGJwuHWxT5RG2ivQFTxLvPqRwjnKxAU6
change detected EtFcFogovBJsXKuN5qPemF7U4RBdvzVmSLUzvXdU5PX6
change detected 4AHRR7uSboC1eMY18CxB1r6vtv5mkPVX53ieCQGqJM58
change detected 8ZVaNyNZQkcMzF7esuZoRgRo7Rc9eKEN18v4zw7Ng8JZ
change detected 8ZVaNyNZQkcMzF7esuZoRgRo7Rc9eKEN18v4zw7Ng8JZ
change detected EtFcFogovBJsXKuN5qPemF7U4RBdvzVmSLUzvXdU5PX6
change detected F3cScQ9u1EGLVGJwuHWxT5RG2ivQFTxLvPqRwjnKxAU6
change detected 4AHRR7uSboC1eMY18CxB1r6vtv5mkPVX53ieCQGqJM58
change detected F3cScQ9u1EGLVGJwuHWxT5RG2ivQFTxLvPqRwjnKxAU6
change detected 8ZVaNyNZQkcMzF7esuZoRgRo7Rc9eKEN18v4zw7Ng8JZ
change detected EtFcFogovBJsXKuN5qPemF7U4RBdvzVmSLUzvXdU5PX6
change detected GRcGGG8XinkW2n8vpBeHNY8SU5rP99URzFQweBNjjnaA
change detected 87Y91Pg2z1ajpYjb1kukss9CbubTnqfcGRouQygV79uC
change detected F3cScQ9u1EGLVGJwuHWxT5RG2ivQFTxLvPqRwjnKxAU6
change detected 9nvdGuywayh53yB3dGYdmD4Y8uwnm35eEtkNHc6oZLPE
change detected GRcGGG8XinkW2n8vpBeHNY8SU5rP99URzFQweBNjjnaA
change detected F3cScQ9u1EGLVGJwuHWxT5RG2ivQFTxLvPqRwjnKxAU6
change detected 4AHRR7uSboC1eMY18CxB1r6vtv5mkPVX53ieCQGqJM58
change detected 8ZVaNyNZQkcMzF7esuZoRgRo7Rc9eKEN18v4zw7Ng8JZ
change detected EtFcFogovBJsXKuN5qPemF7U4RBdvzVmSLUzvXdU5PX6
change detected EtFcFogovBJsXKuN5qPemF7U4RBdvzVmSLUzvXdU5PX6
change detected 8ZVaNyNZQkcMzF7esuZoRgRo7Rc9eKEN18v4zw7Ng8JZ
change detected GRcGGG8XinkW2n8vpBeHNY8SU5rP99URzFQweBNjjnaA
change detected F3cScQ9u1EGLVGJwuHWxT5RG2ivQFTxLvPqRwjnKxAU6
change detected 4AHRR7uSboC1eMY18CxB1r6vtv5mkPVX53ieCQGqJM58
change detected 4AHRR7uSboC1eMY18CxB1r6vtv5mkPVX53ieCQGqJM58
change detected GRcGGG8XinkW2n8vpBeHNY8SU5rP99URzFQweBNjjnaA
change detected 8ZVaNyNZQkcMzF7esuZoRgRo7Rc9eKEN18v4zw7Ng8JZ
change detected F3cScQ9u1EGLVGJwuHWxT5RG2ivQFTxLvPqRwjnKxAU6
change detected EtFcFogovBJsXKuN5qPemF7U4RBdvzVmSLUzvXdU5PX6
change detected GRcGGG8XinkW2n8vpBeHNY8SU5rP99URzFQweBNjjnaA
change detected 8ZVaNyNZQkcMzF7esuZoRgRo7Rc9eKEN18v4zw7Ng8JZ
change detected EtFcFogovBJsXKuN5qPemF7U4RBdvzVmSLUzvXdU5PX6
change detected F3cScQ9u1EGLVGJwuHWxT5RG2ivQFTxLvPqRwjnKxAU6
stop listening...

*/
