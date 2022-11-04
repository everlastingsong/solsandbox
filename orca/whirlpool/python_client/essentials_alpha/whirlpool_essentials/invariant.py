# https://github.com/alexreardon/tiny-invariant/blob/master/src/tiny-invariant.ts

PREFIX = "Invariant failed"


class InvaliantFailedError(Exception):
    pass


def invariant(condition, message: str = None):
    if condition:
        return
    value = PREFIX if message is None else "{}: {}".format(PREFIX, message)
    raise InvaliantFailedError(value)