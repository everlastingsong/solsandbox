// tested with @orca-so/whirlpools-sdk v0.11.7

import { Connection, Context, PublicKey, Keypair, KeyedAccountInfo } from "@solana/web3.js";
import {
    WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID,
    PriceMath, WhirlpoolData, ParsableWhirlpool, getAccountSize, AccountName, PREFER_CACHE
} from "@orca-so/whirlpools-sdk";
import { BN, Wallet } from "@coral-xyz/anchor";

interface WhirlpoolMonitorCallback { (slot: number, whirlpool_pubkey: PublicKey, whirlpool_data: WhirlpoolData): void; };

const WHIRLPOOL_ACCOUNT_SIZE = getAccountSize(AccountName.Whirlpool);

class AllWhirlpoolMonitor {
  private connection: Connection;
  private whirlpool_program: PublicKey;
  private callback: WhirlpoolMonitorCallback;

  private subscription_id: number;
  private sqrt_price_emitted: Map<String, BN>;

  constructor(connection: Connection, whirlpool_program: PublicKey, callback: WhirlpoolMonitorCallback) {
    this.connection = connection;
    this.whirlpool_program = whirlpool_program;
    this.callback = callback;
  }

  public start_monitoring() {
    this.sqrt_price_emitted = new Map<String, BN>();

    // Whirlpool account can be identified by the size
    const filters = [{ dataSize: WHIRLPOOL_ACCOUNT_SIZE }];
    this.subscription_id = this.connection.onProgramAccountChange(
      this.whirlpool_program,
      this.update_whirlpool.bind(this),
      this.connection.commitment,
      filters
    );
  }

  public async stop_monitoring() {
    await this.connection.removeProgramAccountChangeListener(this.subscription_id);
  }

  private updated(slot: number, whirlpool_pubkey: PublicKey, whirlpool_data: WhirlpoolData) {
    const b58 = whirlpool_pubkey.toBase58();

    // filter callback with same sqrt_price
    if ( this.sqrt_price_emitted.get(b58)?.eq(whirlpool_data.sqrtPrice) ) return;

    this.sqrt_price_emitted.set(b58, whirlpool_data.sqrtPrice);
    this.callback(slot, whirlpool_pubkey, whirlpool_data);
  }

  private update_whirlpool(keyed_account_info: KeyedAccountInfo, context: Context) {
    const whirlpool_pubkey = keyed_account_info.accountId;
    const whirlpool_data = ParsableWhirlpool.parse(keyed_account_info.accountId, keyed_account_info.accountInfo);
    this.updated(context.slot, whirlpool_pubkey, whirlpool_data);
  }
}


async function main() {
  const RPC_ENDPOINT_URL = process.env["RPC_ENDPOINT_URL"];
  const commitment = "confirmed";

  const connection = new Connection(RPC_ENDPOINT_URL, commitment);
  const dummy_wallet = new Wallet(Keypair.generate());
  const ctx = WhirlpoolContext.from(connection, dummy_wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const fetcher = ctx.fetcher;

  const all_whirlpool_monitor = new AllWhirlpoolMonitor(connection, ORCA_WHIRLPOOL_PROGRAM_ID, async (slot, whirlpool_pubkey, whirlpool_data) => {
    const token_a = await fetcher.getMintInfo(whirlpool_data.tokenMintA, PREFER_CACHE); // decimals is constant, so cacheable
    const token_b = await fetcher.getMintInfo(whirlpool_data.tokenMintB, PREFER_CACHE); // decimals is constant, so cacheable
    const sqrt_price = whirlpool_data.sqrtPrice.toString();
    const price = PriceMath.sqrtPriceX64ToPrice(
      whirlpool_data.sqrtPrice,
      token_a.decimals,
      token_b.decimals
    ).toFixed(token_b.decimals);

    const b58 = whirlpool_pubkey.toBase58();
    console.log(`price updated at slot ${slot}, whirlpool = ${b58}, sqrt_price = ${sqrt_price}, price = ${price}`);
  })

  console.log("start monitoring...");
  all_whirlpool_monitor.start_monitoring();

  // sleep...
  const sleep_sec = 60;
  await new Promise(resolve => setTimeout(resolve, sleep_sec*1000));

  console.log("stop monitoring...");
  await all_whirlpool_monitor.stop_monitoring();
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/12b_monitor_all_whirlpool.ts 
start monitoring...
price updated at slot 154148444, whirlpool = CPsTfDvZYeVB5uTqQZcwwTTBJ7KPFvB6JKLGSWsFZEL7, sqrt_price = 81879927832918960277, price = 19.702233302
price updated at slot 154148452, whirlpool = H1fREbTWrkhCs2stH3tKANWJepmqeF9hww4nWRYrM7uV, sqrt_price = 24656435586720240, price = 0.001786
price updated at slot 154148477, whirlpool = 4fuUiYxTQ6QCrdSq9ouBYcTM7bqSwYTSyLueGZLTy4T4, sqrt_price = 18445389837208153719, price = 0.999853
price updated at slot 154148482, whirlpool = HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ, sqrt_price = 3347625006037107584, price = 32.933217
price updated at slot 154148487, whirlpool = 5AX84BrKDWpUZ87fbQpkm7XsSx8bWwANePRmAx17tQjM, sqrt_price = 648554032959332575542, price = 1236.097942640
price updated at slot 154148487, whirlpool = 2fPqLazJ91cKRoZoH9XHC2YQnRq2wBZZpbcNx4HYoQXY, sqrt_price = 95110592333658535, price = 0.026583
price updated at slot 154148493, whirlpool = CPsTfDvZYeVB5uTqQZcwwTTBJ7KPFvB6JKLGSWsFZEL7, sqrt_price = 81880778266845759494, price = 19.702642573
price updated at slot 154148494, whirlpool = AiZa55wSymdzwU9VDoWBrjizFjHdzDJFRNks2enP35sw, sqrt_price = 3348693258989238915, price = 32.954239
price updated at slot 154148495, whirlpool = ApLVWYdXzjoDhBHeRx6SnbFWv4MYjFMih5FijDQUJk5R, sqrt_price = 581227393153831998, price = 0.992779
price updated at slot 154148511, whirlpool = 3jLRacqwVaxLC6fSNaZSHiC7samXPkSkJ3j5d6QJUaEL, sqrt_price = 5045493714627651808, price = 0.00074811
price updated at slot 154148513, whirlpool = Db4AyCBKyH5pcCxJuvQzWfFsVsSH6rM9sm21HbA4WU5, sqrt_price = 942257748939383438, price = 0.02609155
price updated at slot 154148544, whirlpool = Fvtf8VCjnkqbETA6KtyHYqHm26ut6w184Jqm4MQjPvv7, sqrt_price = 18435794761750295350, price = 0.998813
price updated at slot 154148561, whirlpool = 963Do8Jw6aKaRB7YLorAGrqAJqhWqVGAStkewfne1SX5, sqrt_price = 18434712142428877265, price = 0.998695
price updated at slot 154148562, whirlpool = GpqMSH1YM6oPmJ5xxEE2KfePf7uf5rXFbTW2TnxicRj6, sqrt_price = 98714523340929266723, price = 0.028636679
price updated at slot 154148563, whirlpool = 4eJ1jCPysCrEH53VUAxgNT8BMccXsgHX1nX4FxXAUVWy, sqrt_price = 98377611033236981634, price = 0.028441539
price updated at slot 154148565, whirlpool = 3jLRacqwVaxLC6fSNaZSHiC7samXPkSkJ3j5d6QJUaEL, sqrt_price = 5045493706491199483, price = 0.00074811
price updated at slot 154148572, whirlpool = HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ, sqrt_price = 3347781171033977043, price = 32.936290
price updated at slot 154148572, whirlpool = E5KuHFnU2VuuZFKeghbTLazgxeni4dhQ7URE4oBtJju2, sqrt_price = 67413640595948883214, price = 1335.537594
price updated at slot 154148575, whirlpool = E5KuHFnU2VuuZFKeghbTLazgxeni4dhQ7URE4oBtJju2, sqrt_price = 67419104940967313464, price = 1335.754112
stop monitoring...

*/
