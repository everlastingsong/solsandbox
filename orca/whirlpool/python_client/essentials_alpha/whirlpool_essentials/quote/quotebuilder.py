from .increase_liquidity import IncreaseLiquidityQuote, IncreaseLiquidityQuoteParams, increase_liquidity_quote_by_input_token_with_params
from .decrease_liquidity import DecreaseLiquidityQuote, DecreaseLiquidityQuoteParams, decrease_liquidity_quote_by_liquidity_with_params


class QuoteBuilder:
    @staticmethod
    def increase_liquidity_by_input_token(params: IncreaseLiquidityQuoteParams) -> IncreaseLiquidityQuote:
        return increase_liquidity_quote_by_input_token_with_params(params)

    @staticmethod
    def decrease_liquidity_by_liquidity(params: DecreaseLiquidityQuoteParams) -> DecreaseLiquidityQuote:
        return decrease_liquidity_quote_by_liquidity_with_params(params)
