from typing import List, Union
from solders.account import Account
from solana.publickey import PublicKey
from solana.rpc.async_api import AsyncClient
from spl.token.core import MintInfo, AccountInfo
from .static_client.accounts import Whirlpool, WhirlpoolsConfig, FeeTier, Position, TickArray
from .accountparser import AccountParser


BULK_FETCH_CHUNK_SIZE = 100


# https://github.com/orca-so/whirlpools/blob/7b9ec351e2048c5504ffc8894c0ec5a9e78dc113/sdk/src/network/public/fetcher.ts
class AccountFetcher:
    def __init__(self, connection: AsyncClient):
        self._connection = connection
        self._cache = {}

    async def _get(self, pubkey: PublicKey, parser, refresh: bool):
        key = str(pubkey)
        if not refresh and key in self._cache:
            return self._cache[key]

        res = await self._connection.get_account_info(pubkey)
        if res.value is None:
            return None

        parsed = parser(res.value.data)
        if parsed is None:
            return None

        self._cache[key] = parsed
        return parsed

    async def _list(self, pubkeys: List[PublicKey], parser, refresh: bool):
        fetch_needed = list(filter(lambda p: refresh or str(p) not in self._cache, pubkeys))

        if len(fetch_needed) > 0:
            fetched = await self._bulk_fetch(fetch_needed)
            for i in range(len(fetch_needed)):
                if fetched[i] is None:
                    continue
                parsed = parser(fetched[i].data)
                if parsed is None:
                    continue
                self._cache[str(fetch_needed[i])] = parsed

        return list(map(lambda p: self._cache.get(str(p)), pubkeys))

    async def _bulk_fetch(self, pubkeys: List[PublicKey]) -> List[Union[Account, None]]:
        accounts = []
        for i in range(0, len(pubkeys), BULK_FETCH_CHUNK_SIZE):
            chunk = pubkeys[i:(i+BULK_FETCH_CHUNK_SIZE)]
            fetched = await self._connection.get_multiple_accounts(chunk)
            accounts.extend(fetched.value)
        return accounts

    async def get_whirlpool(self, pubkey: PublicKey, refresh: bool = False) -> Whirlpool:
        return await self._get(pubkey, AccountParser.parse_whirlpool, refresh)

    async def get_whirlpools_config(self, pubkey: PublicKey, refresh: bool = False) -> WhirlpoolsConfig:
        return await self._get(pubkey, AccountParser.parse_whirlpools_config, refresh)

    async def get_fee_tier(self, pubkey: PublicKey, refresh: bool = False) -> FeeTier:
        return await self._get(pubkey, AccountParser.parse_fee_tier, refresh)

    async def get_position(self, pubkey: PublicKey, refresh: bool = False) -> Position:
        return await self._get(pubkey, AccountParser.parse_position, refresh)

    async def get_tick_array(self, pubkey: PublicKey, refresh: bool = False) -> TickArray:
        return await self._get(pubkey, AccountParser.parse_tick_array, refresh)

    async def get_token_account(self, pubkey: PublicKey, refresh: bool = False) -> AccountInfo:
        return await self._get(pubkey, AccountParser.parse_token_account, refresh)

    async def get_token_mint(self, pubkey: PublicKey, refresh: bool = False) -> MintInfo:
        return await self._get(pubkey, AccountParser.parse_token_mint, refresh)

    async def list_whirlpools(self, pubkeys: List[PublicKey], refresh: bool = False) -> List[Whirlpool]:
        return await self._list(pubkeys, AccountParser.parse_whirlpool, refresh)

    async def list_positions(self, pubkeys: List[PublicKey], refresh: bool = False) -> List[Position]:
        return await self._list(pubkeys, AccountParser.parse_position, refresh)

    async def list_tick_arrays(self, pubkeys: List[PublicKey], refresh: bool = False) -> List[TickArray]:
        return await self._list(pubkeys, AccountParser.parse_tick_array, refresh)

    async def list_token_accounts(self, pubkeys: List[PublicKey], refresh: bool = False) -> List[AccountInfo]:
        return await self._list(pubkeys, AccountParser.parse_token_account, refresh)

    async def list_token_mints(self, pubkeys: List[PublicKey], refresh: bool = False) -> List[MintInfo]:
        return await self._list(pubkeys, AccountParser.parse_token_mint, refresh)
