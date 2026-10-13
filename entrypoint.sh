#!/bin/sh

export BROWSERSTACK_BUILD_NAME="${BROWSERSTACK_BUILD_NAME:-pesticides-ocr-test-automation-${ENVIRONMENT}}"

echo "run_id: $RUN_ID"

TEST_SCRIPT=${TEST_SCRIPT:-"test"}

# BrowserStack occasionally hangs indefinitely, so cap the run at 1 hour.
timeout --signal=TERM --kill-after=30 3600 npm run "$TEST_SCRIPT"
test_exit_code=$?

# !Do Not Remove! Required for test status to show correctly in portal.
if [ $test_exit_code -ne 0 ]; then
  echo "npm run $TEST_SCRIPT exited with code $test_exit_code" > FAILED
fi

# if PUBLISH_TEST_RESULTS is not set, default to true
PUBLISH_TEST_RESULTS=${PUBLISH_TEST_RESULTS:-1}

if [ "$PUBLISH_TEST_RESULTS" -eq 1 ]; then
  npm run report:publish
  publish_exit_code=$?

  if [ $publish_exit_code -ne 0 ]; then
    echo "failed to publish test results"
    exit $publish_exit_code
  fi
fi

# At the end of the test run, if the suite has failed we write a file called 'FAILED'
if [ -f FAILED ]; then
  echo "test suite failed"
  cat ./FAILED
  exit 1
fi

echo "test suite passed"
exit 0
