from behave import given, then, when


class MockDB:
    def __init__(self, results=None):
        self.results = results or []
        self.call_count = 0

    def execute(self, query, params=None):
        if self.call_count < len(self.results):
            result = self.results[self.call_count]
        else:
            result = []
        self.call_count += 1
        return result


@given("I request a path funnel")  # type: ignore[call-non-callable]
def step_request_path_funnel(context):
    context.events = []
    context.db = MockDB()


@when('I provide only one event "{event}"')  # type: ignore[call-non-callable]
def step_provide_one_event(context, event):
    from openflow.api.paths import get_path_funnel

    context.result = get_path_funnel(events=event, db=context.db)


@when("I provide empty events string")  # type: ignore[call-non-callable]
def step_provide_empty_events(context):
    from openflow.api.paths import get_path_funnel

    context.result = get_path_funnel(events="", db=context.db)


@when('I provide events string "{events_str}"')  # type: ignore[call-non-callable]
def step_provide_events_string(context, events_str):
    from openflow.api.paths import get_path_funnel

    context.result = get_path_funnel(events=events_str, db=context.db)


@then('the funnel should have error "{error_message}"')  # type: ignore[call-non-callable]
def step_should_get_funnel_error(context, error_message):
    assert hasattr(context, "result"), "No result was generated"
    assert "error" in context.result, f"Expected error in result, got: {context.result}"
    assert error_message in context.result["error"], (
        f"Expected '{error_message}' in error, got: {context.result['error']}"
    )
