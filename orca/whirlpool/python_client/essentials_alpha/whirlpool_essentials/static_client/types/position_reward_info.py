from __future__ import annotations
import typing
from dataclasses import dataclass
from construct import Container
import borsh_construct as borsh


class PositionRewardInfoJSON(typing.TypedDict):
    growth_inside_checkpoint: int
    amount_owed: int


@dataclass
class PositionRewardInfo:
    layout: typing.ClassVar = borsh.CStruct(
        "growth_inside_checkpoint" / borsh.U128, "amount_owed" / borsh.U64
    )
    growth_inside_checkpoint: int
    amount_owed: int

    @classmethod
    def from_decoded(cls, obj: Container) -> "PositionRewardInfo":
        return cls(
            growth_inside_checkpoint=obj.growth_inside_checkpoint,
            amount_owed=obj.amount_owed,
        )

    def to_encodable(self) -> dict[str, typing.Any]:
        return {
            "growth_inside_checkpoint": self.growth_inside_checkpoint,
            "amount_owed": self.amount_owed,
        }

    def to_json(self) -> PositionRewardInfoJSON:
        return {
            "growth_inside_checkpoint": self.growth_inside_checkpoint,
            "amount_owed": self.amount_owed,
        }

    @classmethod
    def from_json(cls, obj: PositionRewardInfoJSON) -> "PositionRewardInfo":
        return cls(
            growth_inside_checkpoint=obj["growth_inside_checkpoint"],
            amount_owed=obj["amount_owed"],
        )
