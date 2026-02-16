from behave import given, when, then
from openflow.services.path_analyzer import (
    generate_path_analysis_query,
    PathAnalyzerError,
)


@given("I want to analyze paths")
def step_want_analyze_paths(context):
    context.params = {
        "table_name": "events",
        "min_path_length": 2,
        "max_path_length": 5,
        "time_unit": "seconds",
        "group_by": "user_id",
    }


@given("I have an events table")
def step_have_events_table(context):
    context.params = {
        "table_name": "events",
        "min_path_length": 2,
        "max_path_length": 5,
    }


@when("I set min_path_length to {value:d}")
def step_set_min_path_length(context, value):
    context.params["min_path_length"] = value


@when("I set min_path_length to {min_val:d} and max_path_length to {max_val:d}")
def step_set_path_lengths(context, min_val, max_val):
    context.params["min_path_length"] = min_val
    context.params["max_path_length"] = max_val


@when('I set time_unit to "{value}"')
def step_set_time_unit(context, value):
    context.params["time_unit"] = value


@when('I set group_by to "{value}"')
def step_set_group_by(context, value):
    context.params["group_by"] = value


@when(
    "I generate a path analysis query with min_path_length={min_len:d} and max_path_length={max_len:d}"
)
def step_generate_query_basic(context, min_len, max_len):
    context.query = generate_path_analysis_query(
        table_name="events",
        min_path_length=min_len,
        max_path_length=max_len,
    )


@when('I generate a path analysis query with start_event="{event}"')
def step_generate_query_start_event(context, event):
    context.query = generate_path_analysis_query(
        table_name="events",
        start_event=event,
    )


@when('I generate a path analysis query with end_event="{event}"')
def step_generate_query_end_event(context, event):
    context.query = generate_path_analysis_query(
        table_name="events",
        end_event=event,
    )


@when('I generate a path analysis query with date_range from "{start}" to "{end}"')
def step_generate_query_date_range(context, start, end):
    context.query = generate_path_analysis_query(
        table_name="events",
        date_range=(start, end),
    )


@when(
    'I generate a path analysis query with max_time_between_events={time:d} and time_unit="{unit}"'
)
def step_generate_query_time_constraint(context, time, unit):
    context.query = generate_path_analysis_query(
        table_name="events",
        max_time_between_events=time,
        time_unit=unit,
    )


@then('I should get an error "{error_message}"')
def step_should_get_error(context, error_message):
    try:
        generate_path_analysis_query(**context.params)
        raise AssertionError(
            f"Expected error containing '{error_message}' but none was raised"
        )
    except PathAnalyzerError as e:
        assert error_message in str(e), f"Expected '{error_message}' in error, got: {e}"


@then('the query should contain "{text}"')
def step_query_contains(context, text):
    assert hasattr(context, "query"), "No query was generated"
    assert text in context.query, (
        f"Expected '{text}' in query, got: {context.query[:200]}..."
    )


@then("the query should filter paths ending with {event}")
def step_query_filters_end_event(context, event):
    assert hasattr(context, "query"), "No query was generated"
    assert f"'{event}'" in context.query, f"Expected '{event}' in query"
