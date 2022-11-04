from typing import Union
from spl.token.core import MintInfo, AccountInfo
from .static_client.accounts import Whirlpool, WhirlpoolsConfig, TickArray, Position, FeeTier
from .tokenutil import TokenUtil


def safe_decode(decode, data):
    try:
        return decode(data)
    # TODO: too broad exception catch
    except Exception:
        return None


class AccountParser:
    @staticmethod
    def parse_fee_tier(data: bytes) -> Union[FeeTier, None]:
        return safe_decode(FeeTier.decode, data)

    @staticmethod
    def parse_position(data: bytes) -> Union[Position, None]:
        return safe_decode(Position.decode, data)

    @staticmethod
    def parse_tick_array(data: bytes) -> Union[TickArray, None]:
        return safe_decode(TickArray.decode, data)

    @staticmethod
    def parse_whirlpool(data: bytes) -> Union[Whirlpool, None]:
        return safe_decode(Whirlpool.decode, data)

    @staticmethod
    def parse_whirlpools_config(data: bytes) -> Union[WhirlpoolsConfig, None]:
        return safe_decode(WhirlpoolsConfig.decode, data)

    @staticmethod
    def parse_token_mint(data: bytes) -> Union[MintInfo, None]:
        return safe_decode(TokenUtil.deserialize_mint, data)

    @staticmethod
    def parse_token_account(data: bytes) -> Union[AccountInfo, None]:
        return safe_decode(TokenUtil.deserialize_account, data)
