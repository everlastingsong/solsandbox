This repository contains sample codes related to Orca's whirlpool.

# Japanese Tutorial for Whirlpool (Tour de Whirlpool)
https://yugure-sol.notion.site/Tour-de-Whirlpool-afd21607a4b94e3b8e70696ed5e3d8e7

This tutorial covers the following operations.

* Wallet operation - checking balance SOL & Tokens
* Wallet operation - transfer SOL & Tokens
* Swap with whirlpool
* Whirlpool position managmenet
  * open position
  * list & view positions
  * increase liquidity
  * decrease liquidity
  * collect fee & reward
  * close position

All source code is published here.

https://github.com/everlastingsong/tour-de-whirlpool/tree/main/src

# Nebula ecosystem including Whirlpools
https://everlastingsong.github.io/nebula/

You can use 4 different whirlpools in DEVNET for development & learning purpose!

* SOL / devUSDC
* devUSDC / devUSDT
* devSAMO / devUSDC
* devTMAC / devUSDC

You can get all required tokens in the page.

# Transaction Sample
* [Swap with ATA creation (SOL to mSOL)](https://solscan.io/tx/3fRJohHVpzKTGt23v1oudxRu7M3t4NcMdL5GpdHkb5Zx9zzS8ud9LnDUD4L1pfHDfaPvL17KcpoFuuhghJd2d6yo)
* Position Management
  * [Open Position with Metadata (SOL/mSOL)](https://solscan.io/tx/3deYeJtH3dWAtcWYE6AszuGCJXA1hrb2VWi2amdUWQzZk3BHZ7da5RpqLE2hhNE36DhvEkpLuxr5RwtGnFzQ2YZt)
  * [Increase Liquidity (SOL/USDC)](https://solscan.io/tx/Qjsm5Xc9xZzzL6XN67z83i19qPhyZJHpz65ousM4E7rfHDsoxdrc5jbzDfdQH4BzUxyTUfA7stjbW2LAkJhuPLf)
  * [Decrease Liquidity (SOL/USDC)](https://solscan.io/tx/2Aku1adJ9xpjBwW8J8tQ2tn63DNg2HfkuGQEtzhdjoW6xaATU1rgtjqnd1AmcdfBEweTFZA8Z1TdjrU23rnMeD9Y)
  * [Collect fee & rewards (SOL/mSOL)](https://solscan.io/tx/57QKWfyNgv4dHmL97r18fkb7GZQsGQCuRRVkWTofGB1Z8sz5NB3gJ52Tzy4d4Wzwb4x2G3Krirsu33nTeSSB46Sp)
  * [Close Position with NFT burning (SOL/USDC)](https://solscan.io/tx/5ftZoC24tmvWYbtm5x8cg3SjgY7YBpJB8WQt4uNin9eF95UJ6BNeT4ahAWAr1SiQhmdyNxbywe7DHgsKHfvdCTSa)
* Pool Management
  * [Initialize Pool (WOOF/USDC)](https://solscan.io/tx/ohB95cbdM27X9JvYiFMzp3LzshBV8BsZ1SXAEZCqRiRXzsGeTrBr62bmjrtvrapJuh2JdecLBgXUZRT8LeJ4mE6)
  * [Initialize TickArray (WOOF/USDC)](https://solscan.io/tx/47Y1GyzGMWwFRK9Zq9dM3qcYftZr4iwRDCKD79M44ZapSfZNeTJE2RUxf8Mf2ukua2q9zwjiTXk2EdqS8V3Bft3H)

# Whirlpool account structure overview
![account structure overview](../whirlpool_account_structure_overview.svg)

## accounts
* WhirlpoolProgram: whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc
* WhirlpoolsConfig: 2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ
  * fee_authority: 3Pi4tc4SxZyKZivKxWnYfGNxeqFJJxPc8xRw1VnvXpbb 
  * collect_protocol_fees_authority: 3Pi4tc4SxZyKZivKxWnYfGNxeqFJJxPc8xRw1VnvXpbb
  * reward_emission_super_authority: DjDsi34mSB66p2nhBL6YvhbcLtZbkGfNybFeLDjJqxJW
  * feetiers
    * for tick_spacing 1: 62dSkn5ktwY1PoKPNMArZA4bZsvyemuknWUnnQ2ATTuN
    * for tick_spacing 64: HT55NVGVTjWmWLjV7BrSMPVZ7ppU8T2xE5nCAZ6YaGad

* mSOL/USDC Whirlpool
  * whirlpool: AiMZS5U3JMvpdvsr1KeaMiS354Z1DeSg5XjA4yYRxtFf
  * token_mint_a: mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So
  * token_vault_a: 7BgpVo7LDk5MJ29K7p5xbbRASgZ1Q2PhkkHQnKUbZvfj
  * token_mint_b: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
  * token_vault_b: 42mjJXBiccoctt7oDv3RhXqP8Y7mLZ9SNjv6f4ywCi7p
  * rewards
    * reward0_mint: orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE
    * reward0_vault Gm7R7v4mJL7TBeP1qQBXiMJaLrme57KMgt3ZpgLmv14H
    * reward1_mint: MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey
    * reward1_vault: D8qyK7BjxnJTkGYnuAyhac8zYxb8rmaBt1y9zDFjsvPw
  * tickarrays (start_tick_index / price / tickaray_pubkey)
    * -50688 / 6.291557 / 8cNSWR4XP3yDcJCdmHCCccuPxizmqZubxZBam9pbDuKC
    * -45056 / 11.049448 / 2JjsJnEzi3bNyUPq7vJfs6c6T1yMkSc6VrpyE5cazUQU
    * -39424 / 19.405419 / 6k1iP7TB4Q2SQYvkE6WSmNNG2RTvu1kMnDK5o8rDs38C
    * -33792 / 34.080460 / HLHqZmm4PYYbUu7VFZXVeBzVDEMaa9kMVkhU8UKTN97r
    * -28160 / 59.853270 / DprtQaMzPhxFHBATwxC8fvMqYt25jdQfj29VeeG7NKsk
    * -22528 / 105.116358 / F1H3ooP69A97e3wbXvX6StYKtErAiTWfgFtUWwcL2DVH
    * -16896 / 184.608940 / GZXAqWt3VmmxAr8rwVFrh43V73pCyVCHUr4SbbnsRUm4
    * -11264 / 324.216530 / AnTM1fwgxYBFfEsavaFiztLkmY9gV5jgNxFk9dpLaVnL
    * -5632 / 569.400149 / BAT1zA7Dfh7KnpK7c2XqZ4pKUeScSh7xZTgk8GHqy4jT
    * 0 / 1000.000000 / C5FNnLBma8oqtQc4sZ2CgJxQjiKPQxj2aXzX32TLY2AS
    * 5632 / 1756.234172 / 2i5hrdfMgMsbhAdcX2TCu933bkbwef2cCYx4wJay8Z2B
    * 11264 / 3084.358468 / 9frFE8ynAY85y178ituNkoUNFyB1JZwbQiBCCHJsnFxX

## references
* [Architecture Overview](https://orca-so.gitbook.io/orca-developer-portal/whirlpools/architecture-overview)
* [state definition](https://github.com/orca-so/whirlpools/tree/main/programs/whirlpool/src/state)

# Useful links related to Whirlpool
## ORCA Official
* [Orca](https://www.orca.so/)
* [FAQs](https://docs.orca.so/)
* [Whirlpools FAQs](https://docs.orca.so/whirlpools/whirlpools-faqs)

## Developer Portal
* [Developer Portal](https://orca-so.gitbook.io/orca-developer-portal/orca/welcome)
  * [Errors](https://orca-so.gitbook.io/orca-developer-portal/whirlpools/interacting-with-the-protocol/errors)

## SDK TypeDoc
* [@orca-so/whirlpools-sdk](https://orca-so.github.io/whirlpools/)
* [@solana/web3.js](https://solana-labs.github.io/solana-web3.js/modules.html)

## GitHub
* [@orca-so/whirlpools](https://github.com/orca-so/whirlpools)
* [@orca-so/orca-sdks](https://github.com/orca-so/orca-sdks)

## Off-chain data
* [whirlpool/pools](https://api.mainnet.orca.so/v1/whirlpool/list)
* [whirlpool/tokens](https://api.mainnet.orca.so/v1/token/list)

## Mathematical background
* [WhitePaper: Uniswap v3 Core](https://uniswap.org/whitepaper-v3.pdf)
* [TechnicalNote: LIQUIDITY MATH IN UNISWAP V3](https://atiselsts.github.io/pdfs/uniswap-v3-liquidity-math.pdf)
* [WhitePaper: Balancer](https://balancer.fi/whitepaper.pdf)
* [(Japanese)Understanding Concentrated Liquidity by yugure.sol](https://note.com/crypto2real/n/n63e82206031b)

## Solana & Anchor
* [Solana Docs](https://docs.solana.com/introduction)
* [Solana Cookbook](https://solanacookbook.com/)
* [Solana JSON RPC API](https://docs.solana.com/developing/clients/jsonrpc-api)
* [Anchor Book](https://book.anchor-lang.com/)
