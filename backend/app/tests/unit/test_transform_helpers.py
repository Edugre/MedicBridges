import uuid

from app.scripts.transform_hrsa_sites import _location_expr, _site_values

_ORG_ID = uuid.uuid4()
_ORG_MAP: dict[str, uuid.UUID] = {"ORG001": _ORG_ID}


# ---------------------------------------------------------------------------
# _location_expr
# ---------------------------------------------------------------------------

class TestLocationExpr:
    def test_valid_coords_returns_expression(self):
        row = {
            "Geocoding Artifact Address Primary X Coordinate": "-87.6298",
            "Geocoding Artifact Address Primary Y Coordinate": "41.8781",
        }
        assert _location_expr(row) is not None

    def test_missing_x_returns_none(self):
        row = {
            "Geocoding Artifact Address Primary X Coordinate": "",
            "Geocoding Artifact Address Primary Y Coordinate": "41.8781",
        }
        assert _location_expr(row) is None

    def test_missing_y_returns_none(self):
        row = {
            "Geocoding Artifact Address Primary X Coordinate": "-87.6298",
            "Geocoding Artifact Address Primary Y Coordinate": "",
        }
        assert _location_expr(row) is None

    def test_non_numeric_x_returns_none(self):
        row = {
            "Geocoding Artifact Address Primary X Coordinate": "N/A",
            "Geocoding Artifact Address Primary Y Coordinate": "41.8781",
        }
        assert _location_expr(row) is None

    def test_empty_row_returns_none(self):
        assert _location_expr({}) is None


# ---------------------------------------------------------------------------
# _site_values
# ---------------------------------------------------------------------------

def _row(**overrides: str) -> dict:
    base: dict = {
        "BHCMIS Organization Identification Number": "ORG001",
        "BPHC Assigned Number": "SITE001",
        "Site Name": "Test Clinic",
        "Site Address": "123 Main St",
        "Site City": "Chicago",
        "Site State Abbreviation": "IL",
        "Site Postal Code": "60601",
        "Site Telephone Number": "312-555-0100",
        "FQHC Site NPI Number": "1234567890",
        "Geocoding Artifact Address Primary X Coordinate": "-87.6298",
        "Geocoding Artifact Address Primary Y Coordinate": "41.8781",
    }
    base.update(overrides)
    return base


class TestSiteValues:
    def test_valid_row_maps_fields(self):
        result = _site_values(_row(), _ORG_MAP)
        assert result is not None
        assert result["bhcmis_id"] == "SITE001"
        assert result["site_name"] == "Test Clinic"
        assert result["organization_id"] == _ORG_ID
        assert result["state"] == "IL"
        assert result["npi"] == "1234567890"

    def test_unknown_org_returns_none(self):
        assert _site_values(
            _row(**{"BHCMIS Organization Identification Number": "UNKNOWN"}),
            _ORG_MAP,
        ) is None

    def test_missing_bhcmis_id_returns_none(self):
        assert _site_values(_row(**{"BPHC Assigned Number": ""}), _ORG_MAP) is None

    def test_missing_site_name_returns_none(self):
        assert _site_values(_row(**{"Site Name": ""}), _ORG_MAP) is None

    def test_empty_optional_fields_become_none(self):
        result = _site_values(
            _row(**{"Site Address": "", "FQHC Site NPI Number": ""}),
            _ORG_MAP,
        )
        assert result is not None
        assert result["address"] is None
        assert result["npi"] is None

    def test_missing_coords_sets_location_none(self):
        result = _site_values(
            _row(**{
                "Geocoding Artifact Address Primary X Coordinate": "",
                "Geocoding Artifact Address Primary Y Coordinate": "",
            }),
            _ORG_MAP,
        )
        assert result is not None
        assert result["location"] is None
