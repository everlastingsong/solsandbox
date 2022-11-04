from __future__ import annotations
import typing
from dataclasses import dataclass
from construct import Container
import borsh_construct as borsh


class OpenPositionBumpsJSON(typing.TypedDict):
    position_bump: int


@dataclass
class OpenPositionBumps:
    layout: typing.ClassVar = borsh.CStruct("position_bump" / borsh.U8)
    position_bump: int

    @classmethod
    def from_decoded(cls, obj: Container) -> "OpenPositionBumps":
        return cls(position_bump=obj.position_bump)

    def to_encodable(self) -> dict[str, typing.Any]:
        return {"position_bump": self.position_bump}

    def to_json(self) -> OpenPositionBumpsJSON:
        return {"position_bump": self.position_bump}

    @classmethod
    def from_json(cls, obj: OpenPositionBumpsJSON) -> "OpenPositionBumps":
        return cls(position_bump=obj["position_bump"])
