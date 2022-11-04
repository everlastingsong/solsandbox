from __future__ import annotations
import typing
from dataclasses import dataclass
from anchorpy.borsh_extension import EnumForCodegen
import borsh_construct as borsh


class LeftJSON(typing.TypedDict):
    kind: typing.Literal["Left"]


class RightJSON(typing.TypedDict):
    kind: typing.Literal["Right"]


@dataclass
class Left:
    discriminator: typing.ClassVar = 0
    kind: typing.ClassVar = "Left"

    @classmethod
    def to_json(cls) -> LeftJSON:
        return LeftJSON(
            kind="Left",
        )

    @classmethod
    def to_encodable(cls) -> dict:
        return {
            "Left": {},
        }


@dataclass
class Right:
    discriminator: typing.ClassVar = 1
    kind: typing.ClassVar = "Right"

    @classmethod
    def to_json(cls) -> RightJSON:
        return RightJSON(
            kind="Right",
        )

    @classmethod
    def to_encodable(cls) -> dict:
        return {
            "Right": {},
        }


DirectionKind = typing.Union[Left, Right]
DirectionJSON = typing.Union[LeftJSON, RightJSON]


def from_decoded(obj: dict) -> DirectionKind:
    if not isinstance(obj, dict):
        raise ValueError("Invalid enum object")
    if "Left" in obj:
        return Left()
    if "Right" in obj:
        return Right()
    raise ValueError("Invalid enum object")


def from_json(obj: DirectionJSON) -> DirectionKind:
    if obj["kind"] == "Left":
        return Left()
    if obj["kind"] == "Right":
        return Right()
    kind = obj["kind"]
    raise ValueError(f"Unrecognized enum kind: {kind}")


layout = EnumForCodegen("Left" / borsh.CStruct(), "Right" / borsh.CStruct())
