import argparse
import os
from .server import run_server


def main() -> None:
    parser = argparse.ArgumentParser(prog="shotrouterd", description="ShotRouter daemon (API + UI)")
    parser.add_argument("serve", nargs="?", default="serve", help=argparse.SUPPRESS)
    parser.add_argument("--host", default=os.environ.get("SHOTROUTER_API_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("SHOTROUTER_API_PORT", "8767")))
    args = parser.parse_args()
    run_server(host=args.host, port=args.port)


if __name__ == "__main__":
    main()

