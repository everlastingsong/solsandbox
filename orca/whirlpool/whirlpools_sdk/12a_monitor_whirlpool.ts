import { Connection, AccountInfo, Context, PublicKey, Keypair } from "@solana/web3.js";
import {
    WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PriceMath, WhirlpoolData, ParsableWhirlpool
} from "@orca-so/whirlpools-sdk";
import { BN, Wallet } from "@project-serum/anchor";

interface WhirlpoolMonitorCallback { (slot: number, whirlpool_data: WhirlpoolData): void; };

class WhirlpoolMonitor {
  private connection: Connection;
  private whirlpool: PublicKey;

  private whirlpool_subscription_id: number;
  private whirlpool_data: WhirlpoolData;
  private whirlpool_update_slot: number;
  private whirlpool_sqrt_price_emitted: BN;
  private callback: WhirlpoolMonitorCallback;

  constructor(connection: Connection, whirlpool: PublicKey, callback: WhirlpoolMonitorCallback) {
    this.connection = connection;
    this.whirlpool = whirlpool;
    this.callback = callback;
  }

  public start_monitoring() {
    this.whirlpool_subscription_id = this.connection.onAccountChange(this.whirlpool, this.update_whirlpool.bind(this));
  }

  public async stop_monitoring() {
    await this.connection.removeAccountChangeListener(this.whirlpool_subscription_id);
  }

  private updated() {
    // filter callback with same sqrt_price
    if ( this.whirlpool_sqrt_price_emitted?.eq(this.whirlpool_data.sqrtPrice) ) return;

    this.whirlpool_sqrt_price_emitted = this.whirlpool_data.sqrtPrice;
    this.callback(this.whirlpool_update_slot, this.whirlpool_data);
  }

  private update_whirlpool(account_info: AccountInfo<Buffer>, context: Context) {
    const whirlpool_data = ParsableWhirlpool.parse(account_info.data);
    this.whirlpool_data = whirlpool_data;
    this.whirlpool_update_slot = context.slot;
    this.updated();
  }
}


async function main() {
  const RPC_ENDPOINT_URL = "https://api.mainnet-beta.solana.com";
  const commitment = "confirmed";

  const connection = new Connection(RPC_ENDPOINT_URL, commitment);
  const dummy_wallet = new Wallet(Keypair.generate());
  const ctx = WhirlpoolContext.from(connection, dummy_wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const client = buildWhirlpoolClient(ctx);

  const SOL_USDC_WHIRLPOOL = new PublicKey("7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm");  // ts = 8
  const whirlpool = await client.getPool(SOL_USDC_WHIRLPOOL);
  const token_a = whirlpool.getTokenAInfo();
  const token_b = whirlpool.getTokenBInfo();

  const whirlpool_monitor = new WhirlpoolMonitor(connection, whirlpool.getAddress(), (slot, whirlpool_data) => {
    const price = PriceMath.sqrtPriceX64ToPrice(
      whirlpool_data.sqrtPrice,
      token_a.decimals,
      token_b.decimals
    ).toFixed(token_b.decimals);
    console.log(`price updated at slot ${slot}, price = ${price}`);
  })

  console.log("start monitoring...");
  whirlpool_monitor.start_monitoring();

  // sleep...
  const sleep_sec = 30;
  await new Promise(resolve => setTimeout(resolve, sleep_sec*1000));

  console.log("stop monitoring...");
  await whirlpool_monitor.stop_monitoring();
}

main();

/*
SAMPLE OUTPUT

$ ts-node src/12a_monitor_whirlpool.ts 
start monitoring...
price updated at slot 152644945, price = 35.295401
price updated at slot 152644955, price = 35.295401
price updated at slot 152645036, price = 35.292890
price updated at slot 152645041, price = 35.291009
price updated at slot 152645043, price = 35.289130
price updated at slot 152645047, price = 35.285379
price updated at slot 152645049, price = 35.278626
price updated at slot 152645050, price = 35.277108
price updated at slot 152645051, price = 35.272598
stop monitoring...

*/
