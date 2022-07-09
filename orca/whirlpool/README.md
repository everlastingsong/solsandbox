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
* [whirlpool/pools](https://mainnet-zp2-v2.orca.so/pools)
* [whirlpool/tokens](https://mainnet-zp2-v2.orca.so/tokens)

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
