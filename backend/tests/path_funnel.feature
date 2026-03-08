Feature: Path Funnel
  Calculate conversion funnels for event sequences

  Scenario: Funnel requires at least two events
    Given I request a path funnel
    When I provide only one event "Home"
    Then the funnel should have error "At least 2 events are required"

  Scenario: Funnel validates empty event parameter
    Given I request a path funnel
    When I provide empty events string
    Then the funnel should have error "At least 2 events are required"

  Scenario: Funnel validates single event with comma
    Given I request a path funnel
    When I provide events string "Home,"
    Then the funnel should have error "At least 2 events are required"
