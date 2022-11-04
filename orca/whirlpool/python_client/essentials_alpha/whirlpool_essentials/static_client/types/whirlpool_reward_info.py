from __future__ import annotations
import typing
from dataclasses import dataclass
from construct import Container
from solana.publickey import PublicKey
from anchorpy.borsh_extension import BorshPubkey
import borsh_construct as borsh


class WhirlpoolRewardInfoJSON(typing.TypedDict):
    mint: str
    vault: str
    authority: str
    emissions_per_second_x64: int
    growth_global_x64: int


@dataclass
class WhirlpoolRewardInfo:
    layout: typing.ClassVar = borsh.CStruct(
        "mint" / BorshPubkey,
        "vault" / BorshPubkey,
        "authority" / BorshPubkey,
        "emissions_per_second_x64" / borsh.U128,
        "growth_global_x64" / borsh.U128,
    )
    mint: PublicKey
    vault: PublicKey
    authority: PublicKey
    emissions_per_second_x64: int
    growth_global_x64: int

    @classmethod
    def from_decoded(cls, obj: Container) -> "WhirlpoolRewardInfo":
        return cls(
            mint=obj.mint,
            vault=obj.vault,
            authority=obj.authority,
            emissions_per_second_x64=obj.emissions_per_second_x64,
            growth_global_x64=obj.growth_global_x64,
        )

    def to_encodable(self) -> dict[str, typing.Any]:
        return {
            "mint": self.mint,
            "vault": self.vault,
            "authority": self.authority,
            "emissions_per_second_x64": self.emissions_per_second_x64,
            "growth_global_x64": self.growth_global_x64,
        }

    def to_json(self) -> WhirlpoolRewardInfoJSON:
        return {
            "mint": str(self.mint),
            "vault": str(self.vault),
            "authority": str(self.authority),
            "emissions_per_second_x64": self.emissions_per_second_x64,
            "growth_global_x64": self.growth_global_x64,
        }

    @classmethod
    def from_json(cls, obj: WhirlpoolRewardInfoJSON) -> "WhirlpoolRewardInfo":
        return cls(
            mint=PublicKey(obj["mint"]),
            vault=PublicKey(obj["vault"]),
            authority=PublicKey(obj["authority"]),
            emissions_per_second_x64=obj["emissions_per_second_x64"],
            growth_global_x64=obj["growth_global_x64"],
        )
