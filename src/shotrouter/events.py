import asyncio
import json
from typing import Any, Dict

from .state import get_app_state


def broadcast(event: str, payload: Dict[str, Any]) -> None:
    """Send an event to all WebSocket subscribers.

    Works in two contexts:
    - Within an active event loop (normal server runtime): schedules a task.
    - Without a running loop (tests/threadpool): executes synchronously.
    """
    st = get_app_state()
    data = json.dumps({"event": event, "data": payload})

    async def _send_all() -> None:
        for ws in list(st.subscribers):
            try:
                await ws.send_text(data)
            except Exception:
                try:
                    st.subscribers.remove(ws)
                except ValueError:
                    pass

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_send_all())
    except RuntimeError:
        # No running loop (e.g., FastAPI TestClient in threadpool). Execute inline.
        try:
            import anyio

            anyio.from_thread.run(_send_all)
        except Exception:
            asyncio.run(_send_all())
