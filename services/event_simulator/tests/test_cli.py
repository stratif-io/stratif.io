import subprocess
import sys


def run_cli(*args):
    return subprocess.run(
        [sys.executable, "-m", "services.event_simulator.cli", *args],
        capture_output=True,
        text=True,
        check=False,
    )


def test_cli_list_prints_available_presets():
    result = run_cli("--list")
    assert result.returncode == 0
    assert "ecommerce_steady" in result.stdout


def test_cli_describe_prints_resolved_config():
    result = run_cli("--describe", "ecommerce_steady")
    assert result.returncode == 0
    assert "E-commerce Steady Growth" in result.stdout
    assert "markov" in result.stdout.lower()
    assert "scale" in result.stdout.lower()


def test_cli_unknown_preset_errors():
    result = run_cli("--describe", "imaginary_thing")
    assert result.returncode != 0
    assert "not found" in (result.stdout + result.stderr).lower()


def test_cli_preset_and_describe_are_mutually_exclusive():
    result = run_cli("--preset", "ecommerce_steady", "--describe", "ecommerce_steady")
    assert result.returncode != 0
    # argparse emits "not allowed with argument" for mutually-exclusive flags.
    assert "not allowed" in (result.stdout + result.stderr).lower()


def test_cli_describe_includes_seed_when_flag_passed():
    """--seed 42 must propagate into the described config (guards Pydantic
    model_copy from silently dropping/renaming the field)."""
    result = run_cli("--describe", "ecommerce_steady", "--seed", "42")
    assert result.returncode == 0
    assert '"random_seed": 42' in result.stdout


def test_derived_table_name_base_case():
    from services.event_simulator.cli import _derived_table_name

    assert _derived_table_name("ecommerce_steady", {}, None) == "ecommerce_steady"


def test_derived_table_name_with_axis_overrides_and_seed():
    from services.event_simulator.cli import _derived_table_name

    name = _derived_table_name(
        "casual_game_addictive",
        {"growth": "flat", "stickiness": "churn_heavy"},
        42,
    )
    # Axis overrides are alphabetically sorted; seed suffix applied last.
    assert name == "casual_game_addictive_growth_flat_stickiness_churn_heavy_seed42"


def test_derived_table_name_is_sql_safe_identifier():
    from services.event_simulator.cli import _derived_table_name

    name = _derived_table_name("weird/preset-name", {"growth": "some value"}, None)
    # Non-alphanumeric chars collapse to underscores.
    assert all(c.isalnum() or c == "_" for c in name)
