from __future__ import annotations
import typing
from dataclasses import dataclass
from construct import Container
import borsh_construct as borsh


class WhirlpoolBumpsJSON(typing.TypedDict):
    whirlpool_bump: int


@dataclass
class WhirlpoolBumps:
    layout: typing.ClassVar = borsh.CStruct("whirlpool_bump" / borsh.U8)
    whirlpool_bump: int

    @classmethod
    def from_decoded(cls, obj: Container) -> "WhirlpoolBumps":
        return cls(whirlpool_bump=obj.whirlpool_bump)

    def to_encodable(self) -> dict[str, typing.Any]:
        return {"whirlpool_bump": self.whirlpool_bump}

    def to_json(self) -> WhirlpoolBumpsJSON:
        return {"whirlpool_bump": self.whirlpool_bump}

    @classmethod
    def from_json(cls, obj: WhirlpoolBumpsJSON) -> "WhirlpoolBumps":
        return cls(whirlpool_bump=obj["whirlpool_bump"])
