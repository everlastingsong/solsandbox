from __future__ import annotations
import typing
from dataclasses import dataclass
from anchorpy.borsh_extension import EnumForCodegen
import borsh_construct as borsh


class UpperJSON(typing.TypedDict):
    kind: typing.Literal["Upper"]


class LowerJSON(typing.TypedDict):
    kind: typing.Literal["Lower"]


@dataclass
class Upper:
    discriminator: typing.ClassVar = 0
    kind: typing.ClassVar = "Upper"

    @classmethod
    def to_json(cls) -> UpperJSON:
        return UpperJSON(
            kind="Upper",
        )

    @classmethod
    def to_encodable(cls) -> dict:
        return {
            "Upper": {},
        }


@dataclass
class Lower:
    discriminator: typing.ClassVar = 1
    kind: typing.ClassVar = "Lower"

    @classmethod
    def to_json(cls) -> LowerJSON:
        return LowerJSON(
            kind="Lower",
        )

    @classmethod
    def to_encodable(cls) -> dict:
        return {
            "Lower": {},
        }


TickLabelKind = typing.Union[Upper, Lower]
TickLabelJSON = typing.Union[UpperJSON, LowerJSON]


def from_decoded(obj: dict) -> TickLabelKind:
    if not isinstance(obj, dict):
        raise ValueError("Invalid enum object")
    if "Upper" in obj:
        return Upper()
    if "Lower" in obj:
        return Lower()
    raise ValueError("Invalid enum object")


def from_json(obj: TickLabelJSON) -> TickLabelKind:
    if obj["kind"] == "Upper":
        return Upper()
    if obj["kind"] == "Lower":
        return Lower()
    kind = obj["kind"]
    raise ValueError(f"Unrecognized enum kind: {kind}")


layout = EnumForCodegen("Upper" / borsh.CStruct(), "Lower" / borsh.CStruct())
