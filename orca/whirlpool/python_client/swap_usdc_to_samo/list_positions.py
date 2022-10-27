# ATTENTION!
#
# solana related library:
#   pip install solana
#   pip install anchorpy

import asyncio
import json
import base64
import time
from decimal import Decimal
from typing import NamedTuple
from pathlib import Path
from solana.rpc.async_api import AsyncClient
from solana.rpc.types import TokenAccountOpts
from solana.publickey import PublicKey
from solana.keypair import Keypair
from spl.token.constants import TOKEN_PROGRAM_ID
from anchorpy import Idl, Program, Provider, Wallet, Context
from anchorpy.error import AccountDoesNotExistError

# ported functions from whirlpools-sdk and common-sdk
from whirlpool_porting import ORCA_WHIRLPOOL_PROGRAM_ID, TokenUtil, PoolUtil, PriceMath, PDAUtil

RPC_ENDPOINT_URL = "https://solana-api.projectserum.com"
MY_WALLET_PUBKEY = PublicKey("r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6")


class PositionRelatedAccounts(NamedTuple):
    mint: PublicKey
    token_account: PublicKey
    position: PublicKey


async def main():
    # create Anchor client
    with Path("whirlpool.json").open() as f:
        raw_idl = json.load(f)
    idl = Idl.from_json(raw_idl)
    connection = AsyncClient(RPC_ENDPOINT_URL)
    provider = Provider(connection, Wallet(Keypair.generate()))  # with dummy wallet
    program = Program(idl, ORCA_WHIRLPOOL_PROGRAM_ID, provider)

    # list all token accounts
    res = await connection.get_token_accounts_by_owner(MY_WALLET_PUBKEY, TokenAccountOpts(program_id=TOKEN_PROGRAM_ID, encoding="base64"))
    token_accounts = res["result"]["value"]

    candidates = []
    for token_account in token_accounts:
        pubkey = PublicKey(token_account["pubkey"])
        data = base64.b64decode(token_account["account"]["data"][0])
        parsed = TokenUtil.deserialize_token_account(data)

        # maybe NFT
        if parsed.amount == 1:
            # derive position address
            position = PDAUtil.get_position(ORCA_WHIRLPOOL_PROGRAM_ID, parsed.mint).pubkey
            candidates.append(PositionRelatedAccounts(parsed.mint, pubkey, position))

    for candidate in candidates:
        try:
            # get position & whirlpool
            position = await program.account["Position"].fetch(candidate.position)
            whirlpool = await program.account["Whirlpool"].fetch(position.whirlpool)

            # calc token amounts
            amounts = PoolUtil.get_token_amounts_from_liquidity(
                position.liquidity,
                whirlpool.sqrt_price,
                PriceMath.tick_index_to_sqrt_price_x64(position.tick_lower_index),
                PriceMath.tick_index_to_sqrt_price_x64(position.tick_upper_index),
                True
            )

            print("POSITION")
            print("  mint:", candidate.mint.to_base58())
            print("  token_account:", candidate.token_account.to_base58())
            print("  position pubkey:", candidate.position.to_base58())
            print("  whirlpool:", position.whirlpool.to_base58())
            print("    token_a:", whirlpool.token_mint_a.to_base58())
            print("    token_b:", whirlpool.token_mint_b.to_base58())
            print("  liquidity:", position.liquidity)
            print("  token_a(u64):", amounts.token_a)
            print("  token_b(u64):", amounts.token_b)

            # slowdown to avoid request storm to RPC
            time.sleep(1)
        except AccountDoesNotExistError:
            pass

asyncio.run(main())

"""
SAMPLE OUTPUT:

POSITION
  mint: b'82JgyaCXte5Cy2GBzXGTMW8FXUvVq2mpJxZ3JTLKUPcb'
  token_account: b'6gpsbv5c3pomYsZnPUubnHyEGY1Z5ZAbNVEriy3v7bn9'
  position pubkey: b'FtdvdfhDQP2KZnkNM3Bh4dtEkMPVa9jLxea2mMsQGLSa'
  whirlpool: b'8Ej6U2za4nwsCUyEXidzG9aWcd69PPtrA3hnVYWgJUx1'
    token_a: b'So11111111111111111111111111111111111111112'
    token_b: b'7Q2afV64in6N6SeZsAAB81TJzwDoD6zpqmHkzi9Dcavn'
  liquidity: 143862061
  token_a(u64): 1243455
  token_b(u64): 449256
POSITION
  mint: b'EWMqkKRJfFd44493aGaz28V1evuVUmQhNKMkk45FieLK'
  token_account: b'EabX3H5z8UZhEXZUA4z1z1pSkE6xFcWaCHTEc9i9Exkq'
  position pubkey: b'FskauJ2rCscRCkeakA9btWjmr8CV4oU9xUePzQZhct7U'
  whirlpool: b'7wp9f3smjBFGk9AAAZkLJUrSLq8p1SUQ4uuNKrAp75AV'
    token_a: b'SoLW9muuNQmEAoBws7CWfYQnXRXMVEG12cQhy6LE2Zf'
    token_b: b'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  liquidity: 1772979
  token_a(u64): 1129951
  token_b(u64): 31155
POSITION
  mint: b'2zq131ekoiRn4yYCU7xND4RJhaPqB6AKi4hsD86Eobi5'
  token_account: b'9EzH522sf19LowMHimPwqU7E81T77uZ5KmnijcvSDtYG'
  position pubkey: b'GKNi4UuYk5XsUTL77PpDC9uowkFPM48mEYmfLss4yBp3'
  whirlpool: b'Fvtf8VCjnkqbETA6KtyHYqHm26ut6w184Jqm4MQjPvv7'
    token_a: b'USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX'
    token_b: b'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  liquidity: 3402372134
  token_a(u64): 0
  token_b(u64): 339881
POSITION
  mint: b'MTyuSRevzwnSLW9s9NFoGWViQ63hnk3uR7Z19rpQhZA'
  token_account: b'69fd81NmuPnYSUe8UuQ7JtSU3xRoF7U5Q64ATfsbAmyY'
  position pubkey: b'EEcRB8qMfTJxQurGajobwBdF2r8wQBMqEpB73cvwM9yG'
  whirlpool: b'2AEWSvUds1wsufnsDPCXjFsJCMJH5SNNm7fSF4kxys9a'
    token_a: b'So11111111111111111111111111111111111111112'
    token_b: b'7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj'
  liquidity: 41191049234
  token_a(u64): 6363475
  token_b(u64): 0

"""