import { Connection, AccountInfo, Context, PublicKey } from '@solana/web3.js';
import { OrcaPoolConfig, getOrca, Network, deserializeAccount } from '@orca-so/sdk';
import Decimal from 'decimal.js';
import { u64 } from "@solana/spl-token";

interface StandardPoolMonitorCallback { (slot: number, amount_a: u64, amount_b: u64): void; };

class StandardPoolMonitor {
  private connection: Connection;
  private token_a_vault: PublicKey;
  private token_b_vault: PublicKey;

  private token_a_subscription_id: number;
  private token_b_subscription_id: number;
  private token_a_amount: u64;
  private token_b_amount: u64;
  private token_a_update_slot: number;
  private token_b_update_slot: number;
  private token_a_amount_emitted: u64;
  private token_b_amount_emitted: u64;
  private callback: StandardPoolMonitorCallback;

  constructor(connection: Connection, token_a_vault: PublicKey, token_b_vault: PublicKey, callback: StandardPoolMonitorCallback) {
    this.connection = connection;
    this.token_a_vault = token_a_vault;
    this.token_b_vault = token_b_vault;
    this.callback = callback;
  }

  public start_monitoring() {
    this.token_a_subscription_id = this.connection.onAccountChange(this.token_a_vault, this.update_token_a.bind(this));
    this.token_b_subscription_id = this.connection.onAccountChange(this.token_b_vault, this.update_token_b.bind(this));
  }

  public async stop_monitoring() {
    await this.connection.removeAccountChangeListener(this.token_a_subscription_id);
    await this.connection.removeAccountChangeListener(this.token_b_subscription_id);
  }

  private updated() {
    // filter unconsistency state
    if ( this.token_a_update_slot !== this.token_b_update_slot ) return;
    // filter callback with same amount
    if ( this.token_a_amount_emitted?.eq(this.token_a_amount) && this.token_b_amount_emitted?.eq(this.token_b_amount) ) return;

    this.token_a_amount_emitted = this.token_a_amount;
    this.token_b_amount_emitted = this.token_b_amount;
    this.callback(this.token_a_update_slot, this.token_a_amount, this.token_b_amount);
  }

  private update_token_a(account_info: AccountInfo<Buffer>, context: Context) {
    const token_account = deserializeAccount(account_info.data);
    this.token_a_amount = token_account.amount;
    this.token_a_update_slot = context.slot;
    this.updated();
  }

  private update_token_b(account_info: AccountInfo<Buffer>, context: Context) {
    const token_account = deserializeAccount(account_info.data);
    this.token_b_amount = token_account.amount;
    this.token_b_update_slot = context.slot;
    this.updated();
  }
}


async function main() {
  const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net";
  const commitment = "confirmed";

  const connection = new Connection(RPC_ENDPOINT_URL, commitment);
  const orca = getOrca(connection, Network.MAINNET);
  const pool = orca.getPool(OrcaPoolConfig.SOL_USDC);

  const token_a = pool.getTokenA();
  const token_b = pool.getTokenB();
  const token_a_vault = token_a.addr;
  const token_b_vault = token_b.addr;

  const pool_monitor = new StandardPoolMonitor(connection, token_a_vault, token_b_vault, (slot, u64_amount_a, u64_amount_b) => {
    const amount_a = new Decimal(u64_amount_a.toString()).div(10**token_a.scale);
    const amount_b = new Decimal(u64_amount_b.toString()).div(10**token_b.scale);
    const price = amount_b.div(amount_a).toFixed(token_b.scale);
    console.log(`price updated at slot ${slot}, price = ${price}`);
  })

  console.log("start monitoring...");
  pool_monitor.start_monitoring();

  // sleep...
  const sleep_sec = 60;
  await new Promise(resolve => setTimeout(resolve, sleep_sec*1000));

  console.log("stop monitoring...");
  await pool_monitor.stop_monitoring();
}

main();

/*
OUTPUT SAMPLE:

$ ts-node monitor_standard_pool.ts 
start monitoring...
price updated at slot 152642244, price = 35.002040
price updated at slot 152642276, price = 35.001942
price updated at slot 152642289, price = 35.001604
price updated at slot 152642302, price = 35.001267
price updated at slot 152642307, price = 35.015280
stop monitoring...

*/
