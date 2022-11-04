from __future__ import annotations
import typing
from dataclasses import dataclass
from construct import Container
import borsh_construct as borsh


class TickJSON(typing.TypedDict):
    initialized: bool
    liquidity_net: int
    liquidity_gross: int
    fee_growth_outside_a: int
    fee_growth_outside_b: int
    reward_growths_outside: list[int]


@dataclass
class Tick:
    layout: typing.ClassVar = borsh.CStruct(
        "initialized" / borsh.Bool,
        "liquidity_net" / borsh.I128,
        "liquidity_gross" / borsh.U128,
        "fee_growth_outside_a" / borsh.U128,
        "fee_growth_outside_b" / borsh.U128,
        "reward_growths_outside" / borsh.U128[3],
    )
    initialized: bool
    liquidity_net: int
    liquidity_gross: int
    fee_growth_outside_a: int
    fee_growth_outside_b: int
    reward_growths_outside: list[int]

    @classmethod
    def from_decoded(cls, obj: Container) -> "Tick":
        return cls(
            initialized=obj.initialized,
            liquidity_net=obj.liquidity_net,
            liquidity_gross=obj.liquidity_gross,
            fee_growth_outside_a=obj.fee_growth_outside_a,
            fee_growth_outside_b=obj.fee_growth_outside_b,
            reward_growths_outside=obj.reward_growths_outside,
        )

    def to_encodable(self) -> dict[str, typing.Any]:
        return {
            "initialized": self.initialized,
            "liquidity_net": self.liquidity_net,
            "liquidity_gross": self.liquidity_gross,
            "fee_growth_outside_a": self.fee_growth_outside_a,
            "fee_growth_outside_b": self.fee_growth_outside_b,
            "reward_growths_outside": self.reward_growths_outside,
        }

    def to_json(self) -> TickJSON:
        return {
            "initialized": self.initialized,
            "liquidity_net": self.liquidity_net,
            "liquidity_gross": self.liquidity_gross,
            "fee_growth_outside_a": self.fee_growth_outside_a,
            "fee_growth_outside_b": self.fee_growth_outside_b,
            "reward_growths_outside": self.reward_growths_outside,
        }

    @classmethod
    def from_json(cls, obj: TickJSON) -> "Tick":
        return cls(
            initialized=obj["initialized"],
            liquidity_net=obj["liquidity_net"],
            liquidity_gross=obj["liquidity_gross"],
            fee_growth_outside_a=obj["fee_growth_outside_a"],
            fee_growth_outside_b=obj["fee_growth_outside_b"],
            reward_growths_outside=obj["reward_growths_outside"],
        )
