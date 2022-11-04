from __future__ import annotations
import typing
from dataclasses import dataclass
from anchorpy.borsh_extension import EnumForCodegen
import borsh_construct as borsh


class BelowJSON(typing.TypedDict):
    kind: typing.Literal["Below"]


class InsideJSON(typing.TypedDict):
    kind: typing.Literal["Inside"]


class AboveJSON(typing.TypedDict):
    kind: typing.Literal["Above"]


@dataclass
class Below:
    discriminator: typing.ClassVar = 0
    kind: typing.ClassVar = "Below"

    @classmethod
    def to_json(cls) -> BelowJSON:
        return BelowJSON(
            kind="Below",
        )

    @classmethod
    def to_encodable(cls) -> dict:
        return {
            "Below": {},
        }


@dataclass
class Inside:
    discriminator: typing.ClassVar = 1
    kind: typing.ClassVar = "Inside"

    @classmethod
    def to_json(cls) -> InsideJSON:
        return InsideJSON(
            kind="Inside",
        )

    @classmethod
    def to_encodable(cls) -> dict:
        return {
            "Inside": {},
        }


@dataclass
class Above:
    discriminator: typing.ClassVar = 2
    kind: typing.ClassVar = "Above"

    @classmethod
    def to_json(cls) -> AboveJSON:
        return AboveJSON(
            kind="Above",
        )

    @classmethod
    def to_encodable(cls) -> dict:
        return {
            "Above": {},
        }


CurrIndexKind = typing.Union[Below, Inside, Above]
CurrIndexJSON = typing.Union[BelowJSON, InsideJSON, AboveJSON]


def from_decoded(obj: dict) -> CurrIndexKind:
    if not isinstance(obj, dict):
        raise ValueError("Invalid enum object")
    if "Below" in obj:
        return Below()
    if "Inside" in obj:
        return Inside()
    if "Above" in obj:
        return Above()
    raise ValueError("Invalid enum object")


def from_json(obj: CurrIndexJSON) -> CurrIndexKind:
    if obj["kind"] == "Below":
        return Below()
    if obj["kind"] == "Inside":
        return Inside()
    if obj["kind"] == "Above":
        return Above()
    kind = obj["kind"]
    raise ValueError(f"Unrecognized enum kind: {kind}")


layout = EnumForCodegen(
    "Below" / borsh.CStruct(), "Inside" / borsh.CStruct(), "Above" / borsh.CStruct()
)
