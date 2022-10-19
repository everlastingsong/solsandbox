# Transaction sample
- Deposit (stSOL/USDC)
  - [setup](https://solscan.io/tx/kZCJQ2Tw1KJZn6n9mcR98VSCoaMaJSa4zCJyLEUXHez3mSTTQnznabKApngYjZE2xkitBoTihk3Wkk3hj6eRXvT)
    - ATokenProgram create ATA for LP token
    - AquafarmProgram init UserFarm (for AQ)
    - ATokenProgram create ATA for Farm(AQ) token
  - [deposit](https://solscan.io/tx/4k5et8aigrLRqGYYLNgWdQ3jsTqeNb6LF6tt9TE1fuQh13D71qDLsAP4cFbV1LJ4bqsb3iYohPF1LVSCcqYCUWhZ)
    - SwapV2Program deposit into stSOL/USDC pool
    - AquafarmProgram convert LP token to Farm token
- Double-Dip (stSOL/USDC)
  - [doubledip](https://solscan.io/tx/4Lg5jcwQRHYuZbeaMZuFkZd5uYxsQnzRdhPcNmjiLcZHZGJAr9SQdAUTD6zdfEisciwvgZtjHveS1SFJ68A9EAv)
    - AquafarmProgram init UserFarm (for DD)
    - ATokenProgram create ATA for Farm(DD) token
    - ATokenProgram create ATA for reward(LDO) token
    - AquafarmProgram convert Farm token to DD token
- Harvest Double-Dip (stSOL/USDC)
  - [harvest](https://solscan.io/tx/5DRnVMZHvtNN9ZNEHMPwqBzj5pBZVGPTQrmSk7iBfE2x8D6PiuhYwbWACgDc3TgqLL4sQGjRg2NH2uJJhXg18aid)
    - AquafarmProgram harvest
- Harvest Aquafarm (MNDE/mSOL)
  - [harvest](https://solscan.io/tx/24vBgQMDv9EvyUiJdjSZnvz8oRzdtsHXuNmPtXcKEFArCeTehMksr38GsAd1z17DR2rGZdbroncmPoZ9TST9HD96)
    - AquafarmProgram harvest
- Harvest&Undip (stSOL/USDC)
  - [doubledip](https://solscan.io/tx/5Lc9665PmmoWuhZWR7iVxK95vdH46U8wZSZFmzayAURuGbvCpYQW1pgd8B8Ty5R1uxR5BBZ17YXRJcBKe2iwriSx)
    - AquafarmProgram revert DD token to Farm token (& harvest)
- Withdraw (stSOL/USDC)
  - [withdraw](https://solscan.io/tx/4hZLc8z44oMyJqBrdPZxfpmoyPWzBoa1ecwzMi4SsWDBTzdoQkLEc4JyRbYLFKNc1td9HgC3mVCDVcv7coAtv7AA)
    - AquafarmProgram revert Farm token to LP token
    - SwapV2Program withdraw from stSOL/USDC pool