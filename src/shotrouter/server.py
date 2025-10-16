import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

from .state import get_app_state
from .api import routes, ws
from . import db
from .config import load_config, get_default_source_candidates
from .watcher import manager as watch_manager
from .sources import registry as source_registry, Source


def create_app() -> FastAPI:
    # Initialize database (default to in-memory unless SHOTROUTER_DB is set)
    db.init(os.environ.get("SHOTROUTER_DB"))

    app = FastAPI(
        title="ShotRouter",
        docs_url="/api/docs",           # Swagger UI
        redoc_url="/api/redoc",         # ReDoc UI
        openapi_url="/api/openapi.json" # OpenAPI schema
    )

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
    # Set a durable default DB path if not defined
    if not os.environ.get("SHOTROUTER_DB"):
        state_dir = Path.home() / ".local" / "state" / "shotrouter"
        state_dir.mkdir(parents=True, exist_ok=True)
        os.environ["SHOTROUTER_DB"] = str(state_dir / "shotrouter.db")
    app = create_app()
    # Start watchers for configured and candidate sources (existing paths only)
    try:
        cfg = load_config()
        for src in cfg.sources:
            p = Path(src.path).expanduser()
            if src.enabled and p.exists():
                watch_manager.start_for(p, debounce_ms=src.debounce_ms or cfg.debounce_ms)
                # ensure visible in sources list
                source_registry.add(Source(path=str(p), enabled=True, debounce_ms=src.debounce_ms or cfg.debounce_ms))
        # If none configured, auto-start on common candidates
        if not cfg.sources:
            for p in get_default_source_candidates():
                watch_manager.start_for(p, debounce_ms=cfg.debounce_ms)
                source_registry.add(Source(path=str(p), enabled=True, debounce_ms=cfg.debounce_ms))
    except Exception:
        import logging
        logging.getLogger("shotrouter").exception("Failed to start watchers")
    uvicorn.run(app, host=host, port=port, log_level="info")
