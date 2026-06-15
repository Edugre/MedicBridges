"""Load the supabase-py client library.

The repo has a `supabase/migrations/` folder for the Supabase CLI. Python treats
that directory as a namespace package named `supabase`, which shadows the pip
package `supabase`. This helper imports the real client from site-packages.
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path

_REPO_ROOT = str(Path(__file__).resolve().parents[1])


def _load() -> object:
    cached = sys.modules.get("supabase")
    if cached is not None and hasattr(cached, "create_client"):
        return cached

    for key in list(sys.modules):
        if key == "supabase" or key.startswith("supabase."):
            del sys.modules[key]

    repo = Path(_REPO_ROOT).resolve()
    filtered_path = [
        entry
        for entry in sys.path
        if entry not in ("", _REPO_ROOT)
        and (not entry or Path(entry).resolve() != repo)
    ]
    original_path = sys.path.copy()
    try:
        sys.path = filtered_path
        return importlib.import_module("supabase")
    except ModuleNotFoundError as exc:
        raise ModuleNotFoundError(
            "The 'supabase' Python package is not installed for this interpreter. "
            "Run: python3 -m pip install -r requirements.txt"
        ) from exc
    finally:
        sys.path = original_path


_supabase = _load()
create_client = _supabase.create_client
Client = _supabase.Client
