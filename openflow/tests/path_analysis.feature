Feature: Path Analysis
  Analyze user journeys through events

  Scenario: Validate minimum path length
    Given I want to analyze paths
    When I set min_path_length to 1
    Then I should get an error "min_path_length must be at least 2"

  Scenario: Validate max path length
    Given I want to analyze paths
    When I set min_path_length to 5 and max_path_length to 3
    Then I should get an error "max_path_length must be >= min_path_length"

  Scenario: Validate time unit
    Given I want to analyze paths
    When I set time_unit to "weeks"
    Then I should get an error "Invalid time_unit"

  Scenario: Validate group_by
    Given I want to analyze paths
    When I set group_by to "session"
    Then I should get an error "Invalid group_by"

  Scenario: Generate basic query
    Given I have an events table
    When I generate a path analysis query with min_path_length=2 and max_path_length=5
    Then the query should contain "user_sequences"
    And the query should contain "all_subsequences"
    And the query should contain "valid_paths"

  Scenario: Filter by start event
    Given I have an events table
    When I generate a path analysis query with start_event="Home"
    Then the query should contain "path[1] = 'Home'"

  Scenario: Filter by end event
    Given I have an events table
    When I generate a path analysis query with end_event="Purchase"
    Then the query should filter paths ending with Purchase

  Scenario: Apply date range filter
    Given I have an events table
    When I generate a path analysis query with date_range from "2026-01-01" to "2026-01-31"
    Then the query should contain "2026-01-01 00:00:00"
    And the query should contain "2026-01-31 23:59:59"

  Scenario: Apply time constraint
    Given I have an events table
    When I generate a path analysis query with max_time_between_events=60 and time_unit="minutes"
    Then the query should contain "3600"
