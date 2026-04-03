from backend.product_db.models import Report


def test_report_model_has_required_columns():
    columns = {c.key for c in Report.__table__.columns}
    assert {
        "id",
        "shortcode",
        "name",
        "created_by_username",
        "page",
        "params",
        "access",
        "snapshot",
        "snapshot_data",
        "created_at",
    }.issubset(columns)


def test_report_defaults():
    r = Report(name="Test", page="trends", params="{}")
    assert r.access == "public"
    assert not r.snapshot
    assert r.created_by_username == ""


def test_report_shortcode_generated():
    r = Report(name="Test", page="trends", params="{}")
    assert r.shortcode is not None
    assert len(r.shortcode) == 6
