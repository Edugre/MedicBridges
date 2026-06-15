"""A minimal in-memory stand-in for the supabase-py client used in API tests.

Supports only the query surface the services actually call:
  rpc(name, params).execute()
  table(name).select(...).in_/eq/contains/order/limit/range(...).execute()
"""

from __future__ import annotations

from typing import Any, Callable


class FakeResponse:
    def __init__(self, data: list[dict[str, Any]], count: int | None = None) -> None:
        self.data = data
        self.count = count


class FakeQuery:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self._rows = list(rows)
        self._limit: int | None = None
        self._range: tuple[int, int] | None = None

    def select(self, *_args: Any, **_kwargs: Any) -> "FakeQuery":
        return self

    def eq(self, field: str, value: Any) -> "FakeQuery":
        self._rows = [r for r in self._rows if r.get(field) == value]
        return self

    def in_(self, field: str, values: list[Any]) -> "FakeQuery":
        allowed = set(values)
        self._rows = [r for r in self._rows if r.get(field) in allowed]
        return self

    def contains(self, field: str, values: list[Any]) -> "FakeQuery":
        self._rows = [
            r for r in self._rows if set(values).issubset(set(r.get(field) or []))
        ]
        return self

    def order(self, *_args: Any, **_kwargs: Any) -> "FakeQuery":
        return self

    def limit(self, n: int) -> "FakeQuery":
        self._limit = n
        return self

    def range(self, start: int, end: int) -> "FakeQuery":
        self._range = (start, end)
        return self

    def execute(self) -> FakeResponse:
        total = len(self._rows)
        rows = self._rows
        if self._range is not None:
            start, end = self._range
            rows = rows[start : end + 1]
        if self._limit is not None:
            rows = rows[: self._limit]
        return FakeResponse(rows, count=total)


class FakeClient:
    def __init__(
        self,
        *,
        tables: dict[str, list[dict[str, Any]]] | None = None,
        rpcs: dict[str, Callable[[dict[str, Any]], list[dict[str, Any]]]] | None = None,
    ) -> None:
        self._tables = tables or {}
        self._rpcs = rpcs or {}

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(self._tables.get(name, []))

    def from_(self, name: str) -> FakeQuery:
        return self.table(name)

    def rpc(self, name: str, params: dict[str, Any]):
        handler = self._rpcs.get(name)
        data = handler(params) if handler else []

        class _RpcExec:
            def execute(self_inner) -> FakeResponse:
                return FakeResponse(data)

        return _RpcExec()
