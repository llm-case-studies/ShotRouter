import asyncio
import json
from typing import Any, Dict

from .state import get_app_state


def broadcast(event: str, payload: Dict[str, Any]) -> None:
    # fire-and-forget send on all active websocket subscribers
    st = get_app_state()
    data = json.dumps({"event": event, "data": payload})

    async def _send_all() -> None:
        for ws in list(st.subscribers):
            try:
                await ws.send_text(data)
            except Exception:
                # drop broken connections silently
                try:
                    st.subscribers.remove(ws)
                except ValueError:
                    pass

    asyncio.create_task(_send_all())

