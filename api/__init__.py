"""MedicBridges FastAPI service.

A thin, typed read layer over the Supabase/PostGIS curated schema. Spatial work
is delegated to PostGIS RPCs; this package only validates input, assembles the
org-nested payload, and enforces the error contract.
"""

__all__ = ["__version__"]

__version__ = "1.0.0"
