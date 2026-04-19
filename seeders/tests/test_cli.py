import subprocess
import sys


def run_cli(*args):
    return subprocess.run(
        [sys.executable, "-m", "seeders.cli", *args],
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
    assert "ecommerce_steady" in result.stdout
    assert "domain" in result.stdout.lower()
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
