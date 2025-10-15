from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

from .state import get_app_state
from .api import routes, ws


def create_app() -> FastAPI:
    app = FastAPI(title="ShotRouter", docs_url="/api/docs", openapi_url="/api/openapi.json")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # API routes & WebSocket
    app.include_router(routes.router, prefix="/api")
    app.include_router(ws.router)

    # Static UI
    app.mount("/", StaticFiles(directory=get_app_state().ui_static_dir, html=True), name="ui")
    return app


def run_server(host: str = "127.0.0.1", port: int = 8767) -> None:
    app = create_app()
    uvicorn.run(app, host=host, port=port, log_level="info")

