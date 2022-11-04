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


class PositionJSON(typing.TypedDict):
    whirlpool: str
    position_mint: str
    liquidity: int
    tick_lower_index: int
    tick_upper_index: int
    fee_growth_checkpoint_a: int
    fee_owed_a: int
    fee_growth_checkpoint_b: int
    fee_owed_b: int
    reward_infos: list[types.position_reward_info.PositionRewardInfoJSON]


@dataclass
class Position:
    discriminator: typing.ClassVar = b"\xaa\xbc\x8f\xe4z@\xf7\xd0"
    layout: typing.ClassVar = borsh.CStruct(
        "whirlpool" / BorshPubkey,
        "position_mint" / BorshPubkey,
        "liquidity" / borsh.U128,
        "tick_lower_index" / borsh.I32,
        "tick_upper_index" / borsh.I32,
        "fee_growth_checkpoint_a" / borsh.U128,
        "fee_owed_a" / borsh.U64,
        "fee_growth_checkpoint_b" / borsh.U128,
        "fee_owed_b" / borsh.U64,
        "reward_infos" / types.position_reward_info.PositionRewardInfo.layout[3],
    )
    whirlpool: PublicKey
    position_mint: PublicKey
    liquidity: int
    tick_lower_index: int
    tick_upper_index: int
    fee_growth_checkpoint_a: int
    fee_owed_a: int
    fee_growth_checkpoint_b: int
    fee_owed_b: int
    reward_infos: list[types.position_reward_info.PositionRewardInfo]

    @classmethod
    async def fetch(
        cls,
        conn: AsyncClient,
        address: PublicKey,
        commitment: typing.Optional[Commitment] = None,
        program_id: PublicKey = PROGRAM_ID,
    ) -> typing.Optional["Position"]:
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
    ) -> typing.List[typing.Optional["Position"]]:
        infos = await get_multiple_accounts(conn, addresses, commitment=commitment)
        res: typing.List[typing.Optional["Position"]] = []
        for info in infos:
            if info is None:
                res.append(None)
                continue
            if info.account.owner != program_id:
                raise ValueError("Account does not belong to this program")
            res.append(cls.decode(info.account.data))
        return res

    @classmethod
    def decode(cls, data: bytes) -> "Position":
        if data[:ACCOUNT_DISCRIMINATOR_SIZE] != cls.discriminator:
            raise AccountInvalidDiscriminator(
                "The discriminator for this account is invalid"
            )
        dec = Position.layout.parse(data[ACCOUNT_DISCRIMINATOR_SIZE:])
        return cls(
            whirlpool=dec.whirlpool,
            position_mint=dec.position_mint,
            liquidity=dec.liquidity,
            tick_lower_index=dec.tick_lower_index,
            tick_upper_index=dec.tick_upper_index,
            fee_growth_checkpoint_a=dec.fee_growth_checkpoint_a,
            fee_owed_a=dec.fee_owed_a,
            fee_growth_checkpoint_b=dec.fee_growth_checkpoint_b,
            fee_owed_b=dec.fee_owed_b,
            reward_infos=list(
                map(
                    lambda item: types.position_reward_info.PositionRewardInfo.from_decoded(
                        item
                    ),
                    dec.reward_infos,
                )
            ),
        )

    def to_json(self) -> PositionJSON:
        return {
            "whirlpool": str(self.whirlpool),
            "position_mint": str(self.position_mint),
            "liquidity": self.liquidity,
            "tick_lower_index": self.tick_lower_index,
            "tick_upper_index": self.tick_upper_index,
            "fee_growth_checkpoint_a": self.fee_growth_checkpoint_a,
            "fee_owed_a": self.fee_owed_a,
            "fee_growth_checkpoint_b": self.fee_growth_checkpoint_b,
            "fee_owed_b": self.fee_owed_b,
            "reward_infos": list(map(lambda item: item.to_json(), self.reward_infos)),
        }

    @classmethod
    def from_json(cls, obj: PositionJSON) -> "Position":
        return cls(
            whirlpool=PublicKey(obj["whirlpool"]),
            position_mint=PublicKey(obj["position_mint"]),
            liquidity=obj["liquidity"],
            tick_lower_index=obj["tick_lower_index"],
            tick_upper_index=obj["tick_upper_index"],
            fee_growth_checkpoint_a=obj["fee_growth_checkpoint_a"],
            fee_owed_a=obj["fee_owed_a"],
            fee_growth_checkpoint_b=obj["fee_growth_checkpoint_b"],
            fee_owed_b=obj["fee_owed_b"],
            reward_infos=list(
                map(
                    lambda item: types.position_reward_info.PositionRewardInfo.from_json(
                        item
                    ),
                    obj["reward_infos"],
                )
            ),
        )
