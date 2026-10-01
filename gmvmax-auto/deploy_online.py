"""Deploy gmvmax-auto/online to Vercel production — stdlib only.

Runs `npx -y vercel@latest deploy --prod --yes` from the repo root
(dashboard Root Directory `gmvmax-auto/online` applies once; do NOT add
--cwd or the path double-applies and the build sees an empty dir).

Usage:
  python gmvmax-auto/deploy_online.py
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))  # gmvmax-auto/
ROOT = os.path.abspath(os.path.join(HERE, os.pardir))  # marketer repo root
ONLINE = os.path.join(HERE, "online")


def main():
    if not os.path.isdir(ONLINE):
        print("missing gmvmax-auto/online (run from the marketer repo)", file=sys.stderr)
        return 1
    # Windows: bare "npx" is npx.cmd, invisible to subprocess without shell.
    exe = "npx.cmd" if os.name == "nt" else "npx"
    cmd = [exe, "-y", "vercel@latest", "deploy", "--prod", "--yes"]
    print("+ (cwd=%s) %s" % (ROOT, " ".join(cmd)))
    try:
        r = subprocess.run(cmd, cwd=ROOT, shell=(os.name == "nt"))
    except FileNotFoundError:
        print("npx not found — install Node.js first", file=sys.stderr)
        return 1
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())
