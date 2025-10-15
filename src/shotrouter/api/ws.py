from typing import Any, Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..state import get_app_state


router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    await ws.accept()
    st = get_app_state()
    st.subscribers.append(ws)
    try:
        while True:
            await ws.receive_text()  # keepalive / ignore client messages
    except WebSocketDisconnect:
        pass
    finally:
        try:
            st.subscribers.remove(ws)
        except ValueError:
            pass

