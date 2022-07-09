import { OrcaWhirlpoolClient, OrcaNetwork } from "@orca-so/whirlpool-sdk";
import { parseWhirlpool } from "@orca-so/whirlpool-client-sdk";
import { Connection, PublicKey } from "@solana/web3.js";

async function main() {
  const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net";
  const commitment = 'confirmed';
  const connection = new Connection(RPC_ENDPOINT_URL, commitment);
  const orca = new OrcaWhirlpoolClient({ network: OrcaNetwork.MAINNET, connection: connection });
  
  const pools = await orca.offchain.getPools()
  const tokens = await orca.offchain.getTokens();

  const pool_pubkeys = Object.values(pools).map((pool) => new PublicKey(pool.address));
  const pool_accounts = await connection.getMultipleAccountsInfo(pool_pubkeys);
  const whirlpools = pool_accounts.map((pa) => parseWhirlpool(pa.data));

  whirlpools.map((pool, i) => console.log(
    "pair", tokens[pool.tokenMintA.toBase58()].symbol, "/", tokens[pool.tokenMintB.toBase58()].symbol,
    " address", pool_pubkeys[i].toBase58(),
    " tokenVaultA", pool.tokenVaultA.toBase58(),
    " tokenVaultB", pool.tokenVaultB.toBase58(),
  ));
}

main();

/*
OUTPUT:

pair ORCA / USDC  address 5Z66YYYaTmmx1R4mATAGLSc8aV4Vfy5tNdJQzk1GP9RF  tokenVaultA AGsWEmKndNhRbSFWtrcDVrsxfoM71j8pVmvGuEwJX8a1  tokenVaultB 2kSYyDFRQpWaouveza4JbyGKBVtd3im8E6wQnPYiwgH9
pair SOL / USDC  address HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ  tokenVaultA 3YQm7ujtXWJU2e9jhp2QGHpnn1ShXn12QjvzMvDgabpX  tokenVaultB 2JTw1fE2wz1SymWUQ7UqpVtrTuKjcd6mWwYwUJUCh2rq
pair mSOL / USDC  address AiMZS5U3JMvpdvsr1KeaMiS354Z1DeSg5XjA4yYRxtFf  tokenVaultA 7BgpVo7LDk5MJ29K7p5xbbRASgZ1Q2PhkkHQnKUbZvfj  tokenVaultB 42mjJXBiccoctt7oDv3RhXqP8Y7mLZ9SNjv6f4ywCi7p
pair wUST / USDC  address HyBtxWGiYKzHG5WERyA6Ks9tq6k33UyXrU9Aj1BUFK2J  tokenVaultA CWArXimAPJrsmDXHA93aYn9ezcXoPfj6zdVZMJddiH1f  tokenVaultB 8ahvzqK1Ljtopm3fR3AHRAypYFbdXTXn7FLYuXUfeH4o
pair USDC / USDT  address 4fuUiYxTQ6QCrdSq9ouBYcTM7bqSwYTSyLueGZLTy4T4  tokenVaultA 4oY1eVHJrt7ywuFoQnAZwto4qcQip1QhYMAhD11PU4QL  tokenVaultB 4dSG9tKHZR4CAictyEnH9XuGZyKapodWXq5xyg7uFwE9
pair SOL / mSOL  address HQcY5n2zP6rW74fyFEhWeBd3LnJpBcZechkvJpmdb8cx  tokenVaultA 2gG2nqzdqDnFRio8ttYyCkesTbfqDcbQLrv19n4weuK6  tokenVaultB EWWSKcyMy2cF1RBmcQMPyN8SafyxoUFzmzWsAqReNmQc
pair mSOL / USDT  address 7A1R3L7AxcxuZHMJjFgskKGeBR5Rwst3Ai5bv5uAWZFG  tokenVaultA 7DZbXiG9eeK3xUPMSDSsUHHps9uxh1X3EQ13jF9SGXb6  tokenVaultB Gn9ZRtqrrxbpLwHi9RVMNEbsBV9UFS7g4LmY3oTNZtoi
pair mSOL / wUST  address 8o4xKJDptG3xNQnYjYn4xBCTxv2Jwpq8AyzSA2AnqWuU  tokenVaultA 2UawJUySBhKyPocu5g53oABooipfr7ESx7DTbStytjT3  tokenVaultB 8HTizoMBFhpTeTDJfH2ERUB6JjG1Lmj9y6h8WBx4SGEZ
pair stSOL / USDC  address AXtdSZ2mpagmtM5aipN5kV9CyGBA8dxhSBnqMRp7UpdN  tokenVaultA 5GXtHDjrM1okAYJZfrmUwpphcsSsLAJEVsn4qx5epZd  tokenVaultB 7HxXmF3PE6oQeoxofLidBKMjvig2L8WFAGbHWLqEYcP1
pair SOL / stSOL  address 2AEWSvUds1wsufnsDPCXjFsJCMJH5SNNm7fSF4kxys9a  tokenVaultA 4iQge2PC2YCT2Dop3cbs33QdEyZtkzKfyYGh2J8idcye  tokenVaultB 71SPVh1eUFC6bZgS6dMxRVsN2h1Y77p9kgb1E3DuWSv4
pair stSOL / USDT  address FAbwB8VgdgSGty5E8dnmNbu5PZnQcvSuLnboJVpw1Rty  tokenVaultA DFXCvLeLiCpUCNYeer1LjzLM1DEfiA5oDfzxRcU3Yw4Q  tokenVaultB 745CoUW7nqnkC4ZSmC48otoW5A5VF9swEkpNdmtfd38S
pair stSOL / wUST  address GgjNX2EAbwyNdU2CRszN5P6ph3BZCFvCNX4VfTjSkUhM  tokenVaultA 6aK69rVxhBiLhYiWH7P7ovfbeB9dSKGL8cKsrSwVAEHj  tokenVaultB 5p6bZrvmR8fnqZ298CRbiCDtGEK2cKDHkhMBaVj7ccfV
pair MNDE / USDC  address 3dvV75ULxUzuyg57ZwQiay5xfNNdxT6Y98LA11vQyneF  tokenVaultA 6eHGA6eFjtx4K1goECwpnZZ4QaPXaar7Kr1EUiF9ELyX  tokenVaultB 2NgBDC3JGkWYQE6Nt9945sb7BZ7fZw8zC48Ndac1pH2o
pair USDC / wLDO  address 3db3DPqaS6x3S9oKTzZfu38kJSDFbLsvUDQ9LuRWHUxn  tokenVaultA 9Gtox4UNuXbhLS7VxjvZiRihwPecK5a7Q7fNKJYok2BV  tokenVaultB RkTYxxbtCHiJ46URWiMgzhF2hU65LnsbBBxxRmXdAwj
pair whETH / USDC  address E5KuHFnU2VuuZFKeghbTLazgxeni4dhQ7URE4oBtJju2  tokenVaultA GGRjuzWii2wsSMBauyFnjbjP1Lq7CoC63HZhbDsee8U7  tokenVaultB 3rmdaUuDJviwHBSaVdwiZW6PKrWkMvPUZCvez5i1GSbD
pair BTC / USDC  address ErSQss3jrqDpQoLEYvo6onzjsi6zm4Sjpoz1pjqz2o6D  tokenVaultA 4BPHQxFBMTzZeRAscy8BBcvEM7tQZfAhwMkMJwPPWt6R  tokenVaultB Cuub3tVf54CwguvM3Se7XLyQAfZV3NmCSb8bTEyXd9UV
pair mSOL / whETH  address 6jZQFLhSAzTYfo33MSQYvwKvZYwxat8kUa29Mz63oHN9  tokenVaultA 3cfBqXmGKTVqZDf4vRDFM5Y1g5K5hPU4UQQ8r6XxYRHm  tokenVaultB F8fXkh6paToXYshvVKaNJkBm5cSYNayzke3GiW8WLu1L
pair mSOL / BTC  address H1fREbTWrkhCs2stH3tKANWJepmqeF9hww4nWRYrM7uV  tokenVaultA 3wJ4YbBbnr9CNEoQsCvT9KNW54Et9XcxW5d2Eotizc8p  tokenVaultB BDor4EeGMrtGRtUZ8PCPDK6Vo1wbQ1afLVaU6LKEiJUt
pair SOL / wUST  address 7egJoBbcdSn493DXiQpCHqwjLYoqYAGoWWsuou3BBgBa  tokenVaultA GUtQHZy29uG8qVh2jB6mFqgnPxM6eTCYH9bKMhfgZwgf  tokenVaultB 8yFxFZvxJ6Ex228Lan9tUdCSGLTXnMPr1gJEaScQJ1SX
pair wUST / wLUNA  address EyQSeSAD3CnehcRw8bChebQgKSaxq88v8fxxcQuCmoue  tokenVaultA 98q2F26LCB7PRYF7NXkoqWAbAwVtJnA6MajYyMLMYoNk  tokenVaultB 2LjPDkiR17kmDfzft5jZA3jSFLWitJpWLMNkgbBtZhLA
pair SAMO / USDC  address 9vqYJjDUFecLL2xPUC4Rc7hyCtZ6iJ4mDiVZX7aFXoAe  tokenVaultA 3xxgYc3jXPdjqpMdrRyKtcddh4ZdtqpaN33fwaWJ2Wbh  tokenVaultB 8xKCx3SGwWR6BUr9mZFm3xwZmCVMuLjXn9iLEU6784FS
pair stSOL / BTC  address J7qn7AvZ4QK9qT6BikVBKA3hUp89Lg9UkqJmXZQEjRxq  tokenVaultA 5hyfNwYoknetbTXViWC2YYHvpKqw1h4dNikorYfBdF8J  tokenVaultB 5hu31upf5DSwWtUX7cRvRGiRnWRhgYgJMFJbvqrXGx7W
pair stSOL / whETH  address Db4AyCBKyH5pcCxJuvQzWfFsVsSH6rM9sm21HbA4WU5  tokenVaultA 7Ts8ScPoQAD7yKofU4mMdgVHYZwCUjNCCVfmAGLNt5EP  tokenVaultB 7sq8DSEDeRMkFfgvojP2HsyVoRHCpBXCmfJeJNk9Vret
pair SHDW / USDC  address AVftUsHvETWNeF21sap8pAwtjbq4Re5NEmHQKrBmsYi4  tokenVaultA 5EXxHehVeMExVQiZViwC6ZT6adyVVWt18UTcqmV9XETM  tokenVaultB GAhAcyUUAgJ6LbNb8ZpTypiMpGDEfbXJgcxg2Fiy2nSd
pair SHDW / SOL  address 6jwmmjnx3mDbA6QauSZ7DY8Z1B8wZncxXM1tJd2unpuS  tokenVaultA E8NvEb8hq34NqAX1iBVpszitwgE2p8vtoBuhbZm4ageh  tokenVaultB 915j5Buu58gvjWP3WkLFNNagAY95S7AHFYo52o23gc45
pair USH / USDC  address ApLVWYdXzjoDhBHeRx6SnbFWv4MYjFMih5FijDQUJk5R  tokenVaultA 6r4SSc3wKTg1ZjAvWLvvGHPtLiTP4rdpG5sfynnRe9tp  tokenVaultB JAG3yu25J5xcriMSJeyb9CeTQJ5EmzPT1iZi3PxbbE7x
pair USDH / stSOL  address GpqMSH1YM6oPmJ5xxEE2KfePf7uf5rXFbTW2TnxicRj6  tokenVaultA 8JA5Vr18xFNHNbHZxFWVCwQg7dH9S93UtTbqkfvnnCxA  tokenVaultB AfUo6o2BQLJdWGoDCtMEVR2kuxevRDu635dP7sS9uyZ2
pair HDG / USDC  address HZUXGiKoFMqEaBRvJZJs4ueFRdK8zrVMb9akHSatNt64  tokenVaultA Dy6ktGLX9So2jwUAGzJA811b2XxXVfP4NfRvgvAUXkZ5  tokenVaultB AVxMdgRUUt28vrMjvq1jR2CxdcRtA2sqBdotrjrgNCiy
pair USDH / USDC  address Fvtf8VCjnkqbETA6KtyHYqHm26ut6w184Jqm4MQjPvv7  tokenVaultA 4WuB7EYM6N42583EnFkWPusbWUZB5X9ESErUU5gQ5dra  tokenVaultB GHQjuFa7XY4GXPYHZ1cWtkqcCqxMQ6eNt4op7dhaVnSd
pair WOOF / USDC  address HcKo7AZ7gYtTUhZqBWUhYxWzz4SPy2WBMhwWKyQYGRBG  tokenVaultA Gq9ubfEq3Hx9TK53vKwpGaAXJZXhSQPGLuxVAbuSvbeY  tokenVaultB FfgbTcdT4wScLUr1HbmVFo6rxn1nLRih3vhMFN54Ff6C
pair ABR / USDC  address F7qyox3dAegTNfd8oBQD97LuCHWzQ9hSjbsF7Kv8kTNc  tokenVaultA 3NpsRa7H93FeGyT53KgeFNF4vX5m1YT5hxpUZJSpeUy1  tokenVaultB 4tS4d1j8vBeBU8zeHHo8sP7DUoNzVG24SZkHKGRNKXiT
pair AVAX / USDC  address DGP8mVP3eDrwjftyFnsntvqZyvSJhHjd4at1rDcr78J4  tokenVaultA 72mNvc9MhwBmqbUAh7F39iAzcULU88jaJ88MxiYQQeyB  tokenVaultB BkbV6XUUTDjKq9rQuisgvLtP3ZSVhmVtBkXAfHYUuMDT
pair USDC / CELO  address 6EfX4sGXsqpAKrE5JaGg3JZgsPeraut3WpQN9FZd9nwg  tokenVaultA 2aEVrBTHrUbgtEdZVJ7UYg2H2Przdka1vvfRvTuxHCU6  tokenVaultB 4gCz7Q2VYHzAUaCZ2nECZh52fU6gE3gU5oQjGJvSLwMx
pair USDC / FTM  address 7gkFzzqrKRS26KUEQXSEPDcjivsKN8sEiioUHGstjA2B  tokenVaultA 4K3k9ogtjHJbiGGV3DJ3ms3DkuEWcrbPuwoF7c1BFPgR  tokenVaultB 97bTRbR56zmvgz4922832vqFZvy17pS6b7kkgEjnCFZR
pair wstETH / stSOL  address 6wKCFZ4VnYtNVmQYAZzs5CHsodG32vPcBQifQkGFYDkK  tokenVaultA 4U7pwmCffeXvGmVhL4hts5xtAiiV8NEbcKJJBdNxVM2c  tokenVaultB EtxDWMD2ERjL2XH1DLZRVDwqg8WLf3LLxjaFNRx4wSWX

*/
