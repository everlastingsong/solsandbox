import { Connection, AccountInfo, Context, PublicKey, Keypair, KeyedAccountInfo } from "@solana/web3.js";
import {
    WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID, buildWhirlpoolClient,
    PriceMath, WhirlpoolData, ParsableWhirlpool, ORCA_WHIRLPOOLS_CONFIG
} from "@orca-so/whirlpools-sdk";
import { BN, Wallet } from "@project-serum/anchor";

interface WhirlpoolMonitorCallback { (slot: number, whirlpool_pubkey: PublicKey, whirlpool_data: WhirlpoolData): void; };

const WHIRLPOOL_ACCOUNT_SIZE = 653;

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

    const filters = [
      // Whirlpool account can be identified by the size
      { dataSize: WHIRLPOOL_ACCOUNT_SIZE },
      // Orca supported whirlpool's config is ORCA_WHIRLPOOLS_CONFIG
      { memcmp: {bytes: ORCA_WHIRLPOOLS_CONFIG.toBase58(), offset: 8}},
    ];
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
    const whirlpool_data = ParsableWhirlpool.parse(keyed_account_info.accountInfo.data);
    this.updated(context.slot, whirlpool_pubkey, whirlpool_data);
  }
}


async function main() {
  const RPC_ENDPOINT_URL = "https://api.mainnet-beta.solana.com";
  const commitment = "confirmed";

  const connection = new Connection(RPC_ENDPOINT_URL, commitment);
  const dummy_wallet = new Wallet(Keypair.generate());
  const ctx = WhirlpoolContext.from(connection, dummy_wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const fetcher = ctx.fetcher;

  const all_whirlpool_monitor = new AllWhirlpoolMonitor(connection, ORCA_WHIRLPOOL_PROGRAM_ID, async (slot, whirlpool_pubkey, whirlpool_data) => {
    const token_a = await fetcher.getMintInfo(whirlpool_data.tokenMintA, false);
    const token_b = await fetcher.getMintInfo(whirlpool_data.tokenMintB, false);
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

$ ts-node src/12c_monitor_orca_supported_whirlpool.ts 
start monitoring...
price updated at slot 182576842, whirlpool = 7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm, sqrt_price = 2716603697773287281, price = 21.687681
price updated at slot 182576847, whirlpool = 7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm, sqrt_price = 2716530793985168995, price = 21.686517
price updated at slot 182576848, whirlpool = 2AEWSvUds1wsufnsDPCXjFsJCMJH5SNNm7fSF4kxys9a, sqrt_price = 17650297863162667212, price = 0.915513247
price updated at slot 182576852, whirlpool = 8QaXeHBrShJTdtN1rWCccBxpSVvKksQ2PCu5nufb2zbk, sqrt_price = 44268898632616205, price = 0.000000
price updated at slot 182576852, whirlpool = 5P6n5omLbLbP4kaPGL8etqQAHEx2UCkaUyvjLDnwV4EY, sqrt_price = 44340812400221140, price = 0.000000
price updated at slot 182576852, whirlpool = 55BrDTCLWayM16GwrMEQU57o4PTm6ceF9wavSdNZcEiy, sqrt_price = 296359519920071054121, price = 25810.613062
price updated at slot 182576852, whirlpool = 5TvhekFV678xA87iDom4yHRzbDnJBJt7xE6yNNEkQgqn, sqrt_price = 294559644218266428278, price = 25498.054685
price updated at slot 182576853, whirlpool = HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ, sqrt_price = 2714975780209190959, price = 21.661696
price updated at slot 182576856, whirlpool = GFRncDxWEGW6urr1Ts5LUQKAzso3VihH9bXvmRVLaKLq, sqrt_price = 85789711868164338, price = 0.021628
price updated at slot 182576860, whirlpool = 3ne4mWqdYuNiYrYZC9TrA3FcfuFdErghH97vNPbjicr1, sqrt_price = 1129960934898173559721, price = 37522123.93340
price updated at slot 182576864, whirlpool = 7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm, sqrt_price = 2716690147759565617, price = 21.689062
price updated at slot 182576866, whirlpool = 7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm, sqrt_price = 2716673041296921474, price = 21.688788
price updated at slot 182576867, whirlpool = 2AEWSvUds1wsufnsDPCXjFsJCMJH5SNNm7fSF4kxys9a, sqrt_price = 17650297857606986230, price = 0.915513246
price updated at slot 182576866, whirlpool = 8wttVyb4QoeHTkDCUJWC3sRCKfQE8SLmBRpJTirVdr2Z, sqrt_price = 363511972014520251848, price = 0.038832
price updated at slot 182576866, whirlpool = Fvtf8VCjnkqbETA6KtyHYqHm26ut6w184Jqm4MQjPvv7, sqrt_price = 18424288996126957517, price = 0.997566
price updated at slot 182576868, whirlpool = DFVTutNYXD8z4T5cRdgpso1G3sZqQvMHWpW2N99E4DvE, sqrt_price = 2718085510020961170, price = 21.711347
price updated at slot 182576868, whirlpool = 2AEWSvUds1wsufnsDPCXjFsJCMJH5SNNm7fSF4kxys9a, sqrt_price = 17650297854829080645, price = 0.915513246
price updated at slot 182576868, whirlpool = 8hcwA1hr1bLGLHXBCadXWDgxsc1BTe4hAKPcQgTVNXL4, sqrt_price = 18440875026858487181, price = 0.999363
price updated at slot 182576869, whirlpool = 7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm, sqrt_price = 2716351932098386350, price = 21.683661
price updated at slot 182576870, whirlpool = 2AEWSvUds1wsufnsDPCXjFsJCMJH5SNNm7fSF4kxys9a, sqrt_price = 17650297849273410887, price = 0.915513245
price updated at slot 182576871, whirlpool = 7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm, sqrt_price = 2716166782525026178, price = 21.680706
price updated at slot 182576871, whirlpool = HwCngan6JmSxeYdizHxDLXUUi21ggoQgVPVSp9rP2Hk1, sqrt_price = 2484189686785612573942, price = 0.001813552
price updated at slot 182576876, whirlpool = 7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm, sqrt_price = 2716190956531331684, price = 21.681092
stop monitoring...

*/
