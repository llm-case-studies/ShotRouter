import argparse
import json
import os
import sys
import urllib.request


def _api_url() -> str:
    host = os.environ.get("SHOTROUTER_API_HOST", "127.0.0.1")
    port = int(os.environ.get("SHOTROUTER_API_PORT", "8767"))
    return f"http://{host}:{port}"


def _post(path: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(_api_url() + path, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _get(path: str) -> dict:
    with urllib.request.urlopen(_api_url() + path) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser(prog="shotrouter", description="ShotRouter developer CLI")
    sub = parser.add_subparsers(dest="cmd")

    p_arm = sub.add_parser("arm", help="Arm next screenshot for a repo")
    p_arm.add_argument("repo_path")
    p_arm.add_argument("--target_dir", default="assets/images")

    sub.add_parser("list", help="List recent screenshots")

    args = parser.parse_args()

    if args.cmd == "arm":
        out = _post("/api/arm", {"repo_path": args.repo_path, "target_dir": args.target_dir})
        print(json.dumps(out, indent=2))
    elif args.cmd == "list":
        out = _get("/api/screenshots?status=inbox&limit=50&offset=0")
        print(json.dumps(out, indent=2))
    else:
        parser.print_help()
        sys.exit(1)

