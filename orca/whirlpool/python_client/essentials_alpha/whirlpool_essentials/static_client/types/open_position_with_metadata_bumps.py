from __future__ import annotations
import typing
from dataclasses import dataclass
from construct import Container
import borsh_construct as borsh


class OpenPositionWithMetadataBumpsJSON(typing.TypedDict):
    position_bump: int
    metadata_bump: int


@dataclass
class OpenPositionWithMetadataBumps:
    layout: typing.ClassVar = borsh.CStruct(
        "position_bump" / borsh.U8, "metadata_bump" / borsh.U8
    )
    position_bump: int
    metadata_bump: int

    @classmethod
    def from_decoded(cls, obj: Container) -> "OpenPositionWithMetadataBumps":
        return cls(position_bump=obj.position_bump, metadata_bump=obj.metadata_bump)

    def to_encodable(self) -> dict[str, typing.Any]:
        return {
            "position_bump": self.position_bump,
            "metadata_bump": self.metadata_bump,
        }

    def to_json(self) -> OpenPositionWithMetadataBumpsJSON:
        return {
            "position_bump": self.position_bump,
            "metadata_bump": self.metadata_bump,
        }

    @classmethod
    def from_json(
        cls, obj: OpenPositionWithMetadataBumpsJSON
    ) -> "OpenPositionWithMetadataBumps":
        return cls(
            position_bump=obj["position_bump"], metadata_bump=obj["metadata_bump"]
        )
