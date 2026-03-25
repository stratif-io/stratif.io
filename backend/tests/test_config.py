from backend.config import Settings


def test_product_db_url_defaults_to_empty():
    s = Settings()
    assert s.product_db_url == ""


def test_auth_enabled_defaults_to_false():
    s = Settings()
    assert s.auth_enabled is False
