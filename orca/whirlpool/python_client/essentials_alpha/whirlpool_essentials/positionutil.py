from .types import PositionStatus


class PositionUtil:
    @staticmethod
    def get_position_status(
        tick_current_index: int,
        tick_lower_index: int,
        tick_upper_index: int,
    ) -> PositionStatus:
        if tick_current_index >= tick_upper_index:
            return PositionStatus.PriceIsAboveRange
        if tick_current_index < tick_lower_index:
            return PositionStatus.PriceIsBelowRange
        return PositionStatus.PriceIsInRange
