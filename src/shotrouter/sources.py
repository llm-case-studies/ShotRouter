from dataclasses import dataclass, field
from typing import List


@dataclass
class Source:
    path: str
    enabled: bool = True
    debounce_ms: int = 400


class SourceRegistry:
    def __init__(self) -> None:
        self._sources: List[Source] = []

    def list(self) -> List[Source]:
        return list(self._sources)

    def add(self, src: Source) -> None:
        if not any(s.path == src.path for s in self._sources):
            self._sources.append(src)

    def remove(self, path: str) -> bool:
        before = len(self._sources)
        self._sources = [s for s in self._sources if s.path != path]
        return len(self._sources) != before


registry = SourceRegistry()

