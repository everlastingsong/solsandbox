import { PublicKey } from "@solana/web3.js";
import { PriceMath } from "@orca-so/whirlpools-sdk";
import Decimal from "decimal.js";

// bash$ ts-node this_script.ts

async function main() {
    // get pool
    const SOL = {mint: new PublicKey("So11111111111111111111111111111111111111112"), decimals: 9};
    const USDC = {mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), decimals: 6};
    const tick_spacing = 64;

    const price_lower = new Decimal("35" /* USDC */);
    const price_upper = new Decimal("45" /* USDC */);

    const tick_index_nearest_lower = PriceMath.priceToTickIndex(price_lower, SOL.decimals, USDC.decimals);
    const tick_index_nearest_upper = PriceMath.priceToTickIndex(price_upper, SOL.decimals, USDC.decimals);

    // initializable = can open position
    const tick_index_initializable_lower = PriceMath.priceToInitializableTickIndex(price_lower, SOL.decimals, USDC.decimals, tick_spacing);
    const tick_index_initializable_upper = PriceMath.priceToInitializableTickIndex(price_upper, SOL.decimals, USDC.decimals, tick_spacing);

    const price_adjusted_lower = PriceMath.tickIndexToPrice(tick_index_initializable_lower, SOL.decimals, USDC.decimals);
    const price_adjusted_upper = PriceMath.tickIndexToPrice(tick_index_initializable_upper, SOL.decimals, USDC.decimals);

    console.log("price range (raw input)", price_lower.toFixed(USDC.decimals), " - ", price_upper.toFixed(USDC.decimals));
    console.log("tick_index range (raw input nearest)", tick_index_nearest_lower, " - ", tick_index_nearest_upper);
    console.log("tick_index range (initializable)", tick_index_initializable_lower, " - ", tick_index_initializable_upper);
    console.log("price range (adjusted)", price_adjusted_lower.toFixed(USDC.decimals), " - ", price_adjusted_upper.toFixed(USDC.decimals));
}

main();

/*
SAMPLE OUTPUT

$ ts-node 93a_check_tick_index_and_price.ts 
price range (raw input) 35.000000  -  45.000000
tick_index range (raw input nearest) -33526  -  -31013
tick_index range (initializable) -33472  -  -30976
price range (adjusted) 35.188616  -  45.164444

*/
