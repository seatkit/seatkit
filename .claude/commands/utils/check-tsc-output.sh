#!/bin/bash

# Check if TypeScript checking is disabled via environment variable
if [ -n "$CLAUDE_IGNORE_TS_ERRORS" ]; then
    echo "TypeScript checking disabled via CLAUDE_IGNORE_TS_ERRORS" >&2
    exit 0
fi

# Check if tmux is installed
if ! command -v tmux &>/dev/null; then
    echo "Error: tmux is not installed. Please install tmux to use TypeScript checking." >&2
    exit 2
fi

# Get the repository root (script is in .claude/commands/utils, so go up 3 levels)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# Configuration
SESSION_NAME="${CLAUDE_TSC_SESSION_NAME:-seatkit-ts}"
WINDOW_NAME="tsc"
TIMEOUT="${CLAUDE_TSC_TIMEOUT:-120}"

# Packages to watch (relative to root/packages)
# Only include packages with actual TypeScript code and typecheck:watch scripts
TSC_PACKAGES=(
    "types"
    # Add more packages here as they are developed:
    # "engine"
    # "api"
    # "web"
    # "ui"
)

# Function to setup tsc window with watchers
setup_tsc_window() {
    local session="$1"
    local first_pkg="${TSC_PACKAGES[0]}"

    echo "Setting up TypeScript watchers in: $ROOT_DIR" >&2

    # Start first watcher in pane 0
    tmux send-keys -t "${session}:${WINDOW_NAME}.0" "cd ${ROOT_DIR}/packages/${first_pkg} && pnpm run typecheck:watch" C-m

    # Create additional panes for remaining packages
    for i in "${!TSC_PACKAGES[@]}"; do
        if [ $i -eq 0 ]; then
            continue  # Skip first package, already handled
        fi

        local pkg="${TSC_PACKAGES[$i]}"

        # Split horizontally
        tmux split-window -h -t "${session}:${WINDOW_NAME}"
        tmux send-keys -t "${session}:${WINDOW_NAME}.${i}" "cd ${ROOT_DIR}/packages/${pkg} && pnpm run typecheck:watch" C-m
    done

    # Balance the panes evenly
    tmux select-layout -t "${session}:${WINDOW_NAME}" even-horizontal
}

# Function to ensure tsc session/window exists
ensure_tsc_session_exists() {
    local session="$1"
    local is_new_setup=false

    # Create session if it doesn't exist
    if ! tmux has-session -t "$session" 2>/dev/null; then
        echo "Creating new tmux session: $session" >&2
        tmux new-session -d -s "$session" -n "$WINDOW_NAME" -c "$ROOT_DIR"
        setup_tsc_window "$session"
        is_new_setup=true
    # Session exists but no "tsc" window
    elif ! tmux list-windows -t "$session" -F '#{window_name}' 2>/dev/null | grep -q "^${WINDOW_NAME}$"; then
        echo "Creating tsc window in session: $session" >&2
        tmux new-window -t "$session" -n "$WINDOW_NAME" -c "$ROOT_DIR"
        setup_tsc_window "$session"
        is_new_setup=true
    fi

    echo "$is_new_setup"
}

# Function to wait for initial compilation
wait_for_initial_compilation() {
    local session="$1"
    local start_time=$(date +%s)

    echo "Waiting for TypeScript compilation to complete..." >&2

    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [ $elapsed -ge $TIMEOUT ]; then
            echo "Warning: Timeout waiting for TypeScript compilation after ${TIMEOUT}s" >&2
            echo "Proceeding with check anyway..." >&2
            break
        fi

        # Check all panes for compilation status
        local all_ready=true
        local pane_count=$(tmux list-panes -t "${session}:${WINDOW_NAME}" -F '#{pane_index}' 2>/dev/null | wc -l)

        for ((i=0; i<pane_count; i++)); do
            local output=$(tmux capture-pane -t "${session}:${WINDOW_NAME}.${i}" -p 2>/dev/null)

            # Check if watcher has started and shown at least one result
            if ! echo "$output" | grep -q "Watching for file changes\|Found .* error"; then
                all_ready=false
                break
            fi
        done

        if [ "$all_ready" = true ]; then
            echo "TypeScript compilation complete" >&2
            break
        fi

        sleep 1
    done
}

# Determine which session to use
if [ -n "$TMUX" ]; then
    # Inside tmux - use current session
    TARGET_SESSION=$(tmux display-message -p '#S')
    echo "Using current tmux session: $TARGET_SESSION" >&2
else
    # Outside tmux - use dedicated session
    TARGET_SESSION="$SESSION_NAME"
    echo "Using dedicated tmux session: $TARGET_SESSION" >&2
fi

# Ensure session and window exist
IS_NEW_SETUP=$(ensure_tsc_session_exists "$TARGET_SESSION")

# Wait for compilation if we just set up the watchers
if [ "$IS_NEW_SETUP" = "true" ]; then
    wait_for_initial_compilation "$TARGET_SESSION"
fi

echo "=== TSC Window Output ===" >&2

# Get all panes in the 'tsc' window
PANES=$(tmux list-panes -t "${TARGET_SESSION}:${WINDOW_NAME}" -F '#{pane_index}')
HAS_ERRORS=false

for pane in $PANES; do
    CURRENT_CMD=$(tmux display-message -t "${TARGET_SESSION}:${WINDOW_NAME}.${pane}" -p '#{pane_current_command}')

    # Only show panes where node is running (TypeScript compilation)
    if [ "$CURRENT_CMD" = "node" ]; then
        CURRENT_PATH=$(tmux display-message -t "${TARGET_SESSION}:${WINDOW_NAME}.${pane}" -p '#{pane_current_path}')

        echo "" >&2
        echo "--- Pane $pane ---" >&2
        echo "Current command: $CURRENT_CMD" >&2
        echo "Working directory: $CURRENT_PATH" >&2
        echo "" >&2

        # Capture all content from the pane
        FULL_OUTPUT=$(tmux capture-pane -t "${TARGET_SESSION}:${WINDOW_NAME}.${pane}" -p)

        # Find the last occurrence of "Starting compilation" and get everything after it
        LAST_COMPILATION=$(echo "$FULL_OUTPUT" | grep -n "Starting compilation" | tail -n 1 | cut -d: -f1)

        if [ -n "$LAST_COMPILATION" ]; then
            # Get everything from the last "Starting compilation" onwards
            RECENT_OUTPUT=$(echo "$FULL_OUTPUT" | tail -n +"$LAST_COMPILATION")
            echo "$RECENT_OUTPUT" >&2

            # Check if TypeScript is in a stable state with no errors
            if ! echo "$RECENT_OUTPUT" | grep -q "Found 0 errors. Watching for file changes."; then
                HAS_ERRORS=true
            fi
        else
            # If no "Starting compilation" found, show last 20 lines
            RECENT_OUTPUT=$(echo "$FULL_OUTPUT" | tail -n 20)
            echo "$RECENT_OUTPUT" >&2

            # Check if TypeScript is in a stable state with no errors
            if ! echo "$RECENT_OUTPUT" | grep -q "Found 0 errors. Watching for file changes."; then
                HAS_ERRORS=true
            fi
        fi
    fi
done

# Exit with appropriate code
if [ "$HAS_ERRORS" = true ]; then
    exit 2
else
    exit 0
fi
