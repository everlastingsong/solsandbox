import { MIN_TICK_INDEX, MAX_TICK_INDEX, PriceMath } from "@orca-so/whirlpools-sdk";

function main() {
  for(let tick=MIN_TICK_INDEX; tick<=MAX_TICK_INDEX; tick++) {
    const sqrt_price_x64 = PriceMath.tickIndexToSqrtPriceX64(tick);
    console.log(tick, sqrt_price_x64.toString());
  }
}

main();

