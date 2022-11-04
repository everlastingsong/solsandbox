import typing
from dataclasses import dataclass
from base64 import b64decode
from solana.publickey import PublicKey
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Commitment
import borsh_construct as borsh
from anchorpy.coder.accounts import ACCOUNT_DISCRIMINATOR_SIZE
from anchorpy.error import AccountInvalidDiscriminator
from anchorpy.utils.rpc import get_multiple_accounts
from anchorpy.borsh_extension import BorshPubkey
from ..program_id import PROGRAM_ID
from .. import types


class WhirlpoolJSON(typing.TypedDict):
    whirlpools_config: str
    whirlpool_bump: list[int]
    tick_spacing: int
    tick_spacing_seed: list[int]
    fee_rate: int
    protocol_fee_rate: int
    liquidity: int
    sqrt_price: int
    tick_current_index: int
    protocol_fee_owed_a: int
    protocol_fee_owed_b: int
    token_mint_a: str
    token_vault_a: str
    fee_growth_global_a: int
    token_mint_b: str
    token_vault_b: str
    fee_growth_global_b: int
    reward_last_updated_timestamp: int
    reward_infos: list[types.whirlpool_reward_info.WhirlpoolRewardInfoJSON]


@dataclass
class Whirlpool:
    discriminator: typing.ClassVar = b"?\x95\xd1\x0c\xe1\x80c\t"
    layout: typing.ClassVar = borsh.CStruct(
        "whirlpools_config" / BorshPubkey,
        "whirlpool_bump" / borsh.U8[1],
        "tick_spacing" / borsh.U16,
        "tick_spacing_seed" / borsh.U8[2],
        "fee_rate" / borsh.U16,
        "protocol_fee_rate" / borsh.U16,
        "liquidity" / borsh.U128,
        "sqrt_price" / borsh.U128,
        "tick_current_index" / borsh.I32,
        "protocol_fee_owed_a" / borsh.U64,
        "protocol_fee_owed_b" / borsh.U64,
        "token_mint_a" / BorshPubkey,
        "token_vault_a" / BorshPubkey,
        "fee_growth_global_a" / borsh.U128,
        "token_mint_b" / BorshPubkey,
        "token_vault_b" / BorshPubkey,
        "fee_growth_global_b" / borsh.U128,
        "reward_last_updated_timestamp" / borsh.U64,
        "reward_infos" / types.whirlpool_reward_info.WhirlpoolRewardInfo.layout[3],
    )
    whirlpools_config: PublicKey
    whirlpool_bump: list[int]
    tick_spacing: int
    tick_spacing_seed: list[int]
    fee_rate: int
    protocol_fee_rate: int
    liquidity: int
    sqrt_price: int
    tick_current_index: int
    protocol_fee_owed_a: int
    protocol_fee_owed_b: int
    token_mint_a: PublicKey
    token_vault_a: PublicKey
    fee_growth_global_a: int
    token_mint_b: PublicKey
    token_vault_b: PublicKey
    fee_growth_global_b: int
    reward_last_updated_timestamp: int
    reward_infos: list[types.whirlpool_reward_info.WhirlpoolRewardInfo]

    @classmethod
    async def fetch(
        cls,
        conn: AsyncClient,
        address: PublicKey,
        commitment: typing.Optional[Commitment] = None,
        program_id: PublicKey = PROGRAM_ID,
    ) -> typing.Optional["Whirlpool"]:
        resp = await conn.get_account_info(address, commitment=commitment)
        info = resp["result"]["value"]
        if info is None:
            return None
        if info["owner"] != str(program_id):
            raise ValueError("Account does not belong to this program")
        bytes_data = b64decode(info["data"][0])
        return cls.decode(bytes_data)

    @classmethod
    async def fetch_multiple(
        cls,
        conn: AsyncClient,
        addresses: list[PublicKey],
        commitment: typing.Optional[Commitment] = None,
        program_id: PublicKey = PROGRAM_ID,
    ) -> typing.List[typing.Optional["Whirlpool"]]:
        infos = await get_multiple_accounts(conn, addresses, commitment=commitment)
        res: typing.List[typing.Optional["Whirlpool"]] = []
        for info in infos:
            if info is None:
                res.append(None)
                continue
            if info.account.owner != program_id:
                raise ValueError("Account does not belong to this program")
            res.append(cls.decode(info.account.data))
        return res

    @classmethod
    def decode(cls, data: bytes) -> "Whirlpool":
        if data[:ACCOUNT_DISCRIMINATOR_SIZE] != cls.discriminator:
            raise AccountInvalidDiscriminator(
                "The discriminator for this account is invalid"
            )
        dec = Whirlpool.layout.parse(data[ACCOUNT_DISCRIMINATOR_SIZE:])
        return cls(
            whirlpools_config=dec.whirlpools_config,
            whirlpool_bump=dec.whirlpool_bump,
            tick_spacing=dec.tick_spacing,
            tick_spacing_seed=dec.tick_spacing_seed,
            fee_rate=dec.fee_rate,
            protocol_fee_rate=dec.protocol_fee_rate,
            liquidity=dec.liquidity,
            sqrt_price=dec.sqrt_price,
            tick_current_index=dec.tick_current_index,
            protocol_fee_owed_a=dec.protocol_fee_owed_a,
            protocol_fee_owed_b=dec.protocol_fee_owed_b,
            token_mint_a=dec.token_mint_a,
            token_vault_a=dec.token_vault_a,
            fee_growth_global_a=dec.fee_growth_global_a,
            token_mint_b=dec.token_mint_b,
            token_vault_b=dec.token_vault_b,
            fee_growth_global_b=dec.fee_growth_global_b,
            reward_last_updated_timestamp=dec.reward_last_updated_timestamp,
            reward_infos=list(
                map(
                    lambda item: types.whirlpool_reward_info.WhirlpoolRewardInfo.from_decoded(
                        item
                    ),
                    dec.reward_infos,
                )
            ),
        )

    def to_json(self) -> WhirlpoolJSON:
        return {
            "whirlpools_config": str(self.whirlpools_config),
            "whirlpool_bump": self.whirlpool_bump,
            "tick_spacing": self.tick_spacing,
            "tick_spacing_seed": self.tick_spacing_seed,
            "fee_rate": self.fee_rate,
            "protocol_fee_rate": self.protocol_fee_rate,
            "liquidity": self.liquidity,
            "sqrt_price": self.sqrt_price,
            "tick_current_index": self.tick_current_index,
            "protocol_fee_owed_a": self.protocol_fee_owed_a,
            "protocol_fee_owed_b": self.protocol_fee_owed_b,
            "token_mint_a": str(self.token_mint_a),
            "token_vault_a": str(self.token_vault_a),
            "fee_growth_global_a": self.fee_growth_global_a,
            "token_mint_b": str(self.token_mint_b),
            "token_vault_b": str(self.token_vault_b),
            "fee_growth_global_b": self.fee_growth_global_b,
            "reward_last_updated_timestamp": self.reward_last_updated_timestamp,
            "reward_infos": list(map(lambda item: item.to_json(), self.reward_infos)),
        }

    @classmethod
    def from_json(cls, obj: WhirlpoolJSON) -> "Whirlpool":
        return cls(
            whirlpools_config=PublicKey(obj["whirlpools_config"]),
            whirlpool_bump=obj["whirlpool_bump"],
            tick_spacing=obj["tick_spacing"],
            tick_spacing_seed=obj["tick_spacing_seed"],
            fee_rate=obj["fee_rate"],
            protocol_fee_rate=obj["protocol_fee_rate"],
            liquidity=obj["liquidity"],
            sqrt_price=obj["sqrt_price"],
            tick_current_index=obj["tick_current_index"],
            protocol_fee_owed_a=obj["protocol_fee_owed_a"],
            protocol_fee_owed_b=obj["protocol_fee_owed_b"],
            token_mint_a=PublicKey(obj["token_mint_a"]),
            token_vault_a=PublicKey(obj["token_vault_a"]),
            fee_growth_global_a=obj["fee_growth_global_a"],
            token_mint_b=PublicKey(obj["token_mint_b"]),
            token_vault_b=PublicKey(obj["token_vault_b"]),
            fee_growth_global_b=obj["fee_growth_global_b"],
            reward_last_updated_timestamp=obj["reward_last_updated_timestamp"],
            reward_infos=list(
                map(
                    lambda item: types.whirlpool_reward_info.WhirlpoolRewardInfo.from_json(
                        item
                    ),
                    obj["reward_infos"],
                )
            ),
        )
