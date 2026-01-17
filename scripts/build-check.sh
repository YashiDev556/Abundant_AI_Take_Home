#!/bin/bash

# Build Check Script
# Comprehensive build, lint, and type-check script for the monorepo
# Produces a detailed summary at the end

set -o pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
BUILD_TIMEOUT=600  # 10 minutes for monorepo
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Use gtimeout on macOS if available, otherwise skip timeout
if command -v gtimeout &> /dev/null; then
    TIMEOUT_CMD="gtimeout"
elif command -v timeout &> /dev/null; then
    TIMEOUT_CMD="timeout"
else
    TIMEOUT_CMD=""
fi

# Results tracking
declare -a ERRORS=()
declare -a WARNINGS=()
declare -a SUCCESSES=()
declare -a MISSING_ENV_VARS=()

# Temp files for capturing output
BUILD_OUTPUT=$(mktemp)
LINT_OUTPUT=$(mktemp)
TYPECHECK_OUTPUT=$(mktemp)
RUNTIME_OUTPUT=$(mktemp)

# Runtime test ports (different from dev to avoid conflicts)
TEST_SERVER_PORT=5000
TEST_SIDECAR_PORT=5001
TEST_FRONTEND_PORT=5002

# PIDs for runtime test servers
SERVER_PID=""
SIDECAR_PID=""
FRONTEND_PID=""

cleanup() {
    rm -f "$BUILD_OUTPUT" "$LINT_OUTPUT" "$TYPECHECK_OUTPUT" "$RUNTIME_OUTPUT"
    # Kill any running test servers
    stop_test_servers
}
trap cleanup EXIT

# Stop test servers
stop_test_servers() {
    if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
        kill "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
    fi
    if [[ -n "$SIDECAR_PID" ]] && kill -0 "$SIDECAR_PID" 2>/dev/null; then
        kill "$SIDECAR_PID" 2>/dev/null || true
        wait "$SIDECAR_PID" 2>/dev/null || true
    fi
    if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" 2>/dev/null || true
        wait "$FRONTEND_PID" 2>/dev/null || true
    fi
    # Also kill any processes on test ports (safety net)
    lsof -ti:$TEST_SERVER_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti:$TEST_SIDECAR_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti:$TEST_FRONTEND_PORT | xargs kill -9 2>/dev/null || true
    SERVER_PID=""
    SIDECAR_PID=""
    FRONTEND_PID=""
}

# Wait for server to be ready
wait_for_server() {
    local url=$1
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    return 1
}

print_header() {
    echo ""
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${BLUE}  $1${NC}"
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${CYAN}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    SUCCESSES+=("$1")
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    ERRORS+=("$1")
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
    WARNINGS+=("$1")
}

# Parse turbo output for missing env vars
parse_env_warnings() {
    local output="$1"
    local in_env_warning=false
    local current_package=""
    
    while IFS= read -r line; do
        # Check for turbo env var warning header
        if [[ "$line" =~ "missing from \"turbo.json\"" ]] || [[ "$line" =~ "WILL NOT be available" ]]; then
            in_env_warning=true
            continue
        fi
        
        # Parse package names and env vars
        if [[ "$in_env_warning" == true ]]; then
            if [[ "$line" =~ \[warn\]\ (@[a-zA-Z0-9/-]+|[a-zA-Z0-9-]+)#build ]]; then
                current_package="${BASH_REMATCH[1]}"
            elif [[ "$line" =~ \[warn\].*-\ ([A-Z_]+) ]]; then
                local env_var="${BASH_REMATCH[1]}"
                # Only add unique entries
                local entry="$env_var (used by $current_package)"
                if [[ ! " ${MISSING_ENV_VARS[*]} " =~ " ${env_var} " ]]; then
                    MISSING_ENV_VARS+=("$env_var")
                fi
            fi
        fi
    done <<< "$output"
}

# Check for common build issues
check_common_issues() {
    print_step "Checking for common issues..."
    
    # Check for turbo cache issues (only warn if very large)
    if [[ -d "$ROOT_DIR/node_modules/.cache/turbo" ]]; then
        local cache_size=$(du -sm "$ROOT_DIR/node_modules/.cache/turbo" 2>/dev/null | cut -f1)
        if [[ "$cache_size" -gt 500 ]]; then
            print_warning "Large turbo cache (${cache_size}MB) - consider clearing: rm -rf node_modules/.cache/turbo"
        fi
    fi
    
    # Check for Next.js build directories
    if [[ -d "$ROOT_DIR/apps/frontend/.next" ]]; then
        print_warning "Found .next directory - build will use isolated .next-build directory"
    fi
}

# Run build with timeout
run_build() {
    print_header "Running Build"
    print_step "Building all packages with turbo..."
    
    cd "$ROOT_DIR"
    
    local start_time=$(date +%s)
    
    # Use isolated build directory for Next.js to avoid conflicts with running dev server
    export NEXT_BUILD_DIR=.next-build
    
    # Run build and capture output (with optional timeout)
    local build_cmd="npm run build"
    if [[ -n "$TIMEOUT_CMD" ]]; then
        build_cmd="$TIMEOUT_CMD $BUILD_TIMEOUT $build_cmd"
    fi
    
    if $build_cmd 2>&1 | tee "$BUILD_OUTPUT"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_success "Build completed in ${duration}s"
        
        # Check for warnings in output
        if grep -qi "warning" "$BUILD_OUTPUT" || grep -qi "finished with warnings" "$BUILD_OUTPUT"; then
            print_warning "Build completed with warnings"
        fi
        
        # Parse env var warnings
        parse_env_warnings "$(cat "$BUILD_OUTPUT")"
        
        return 0
    else
        local exit_code=$?
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        if [[ $exit_code -eq 124 ]]; then
            print_error "Build timed out after ${BUILD_TIMEOUT}s"
        else
            print_error "Build failed after ${duration}s (exit code: $exit_code)"
        fi
        
        # Still parse for env warnings even on failure
        parse_env_warnings "$(cat "$BUILD_OUTPUT")"
        
        return 1
    fi
}

# Run lint
run_lint() {
    print_header "Running Lint"
    print_step "Linting all packages..."
    
    cd "$ROOT_DIR"
    
    if npm run lint 2>&1 | tee "$LINT_OUTPUT"; then
        print_success "Lint passed"
        return 0
    else
        print_error "Lint failed"
        
        # Count lint errors
        local error_count=$(grep -c "error" "$LINT_OUTPUT" 2>/dev/null | head -1 || echo "0")
        local warning_count=$(grep -c "warning" "$LINT_OUTPUT" 2>/dev/null | head -1 || echo "0")
        error_count=${error_count:-0}
        warning_count=${warning_count:-0}
        
        if [[ "$error_count" -gt 0 ]]; then
            print_error "Found $error_count lint error(s)"
        fi
        if [[ "$warning_count" -gt 0 ]]; then
            print_warning "Found $warning_count lint warning(s)"
        fi
        
        return 1
    fi
}

# Run type check
run_typecheck() {
    print_header "Running Type Check"
    print_step "Type checking all packages..."
    
    cd "$ROOT_DIR"
    
    if npm run type-check 2>&1 | tee "$TYPECHECK_OUTPUT"; then
        print_success "Type check passed"
        return 0
    else
        print_error "Type check failed"
        
        # Count type errors
        local error_count=$(grep -c "error TS" "$TYPECHECK_OUTPUT" 2>/dev/null | head -1 || echo "0")
        error_count=${error_count:-0}
        if [[ "$error_count" -gt 0 ]]; then
            print_error "Found $error_count type error(s)"
        fi
        
        return 1
    fi
}

# Cleanup Next.js symlink
cleanup_next_symlink() {
    cd "$ROOT_DIR/apps/frontend" 2>/dev/null || return
    if [[ -L ".next" ]]; then
        rm .next 2>/dev/null || true
    fi
    if [[ -d ".next.original" ]]; then
        mv .next.original .next 2>/dev/null || true
    fi
}

# Run runtime tests
run_runtime_tests() {
    print_header "Running Runtime Tests"
    
    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        print_error "curl is required for runtime tests but not found"
        return 1
    fi
    
    print_step "Starting production servers for runtime testing..."
    
    cd "$ROOT_DIR"
    
    # Ensure we clean up on exit
    trap 'stop_test_servers; cleanup_next_symlink' EXIT
    
    local runtime_failed=false
    local had_original_next=false
    
    # Check if dist directories exist
    if [[ ! -d "$ROOT_DIR/apps/server/dist" ]]; then
        print_error "Server dist directory not found. Build must succeed before runtime tests."
        return 1
    fi
    if [[ ! -d "$ROOT_DIR/apps/sidecar/dist" ]]; then
        print_error "Sidecar dist directory not found. Build must succeed before runtime tests."
        return 1
    fi
    if [[ ! -d "$ROOT_DIR/apps/frontend/.next-build" ]]; then
        print_error "Frontend .next-build directory not found. Build must succeed before runtime tests."
        return 1
    fi
    
    # Start server
    print_step "Starting server on port $TEST_SERVER_PORT..."
    cd "$ROOT_DIR/apps/server"
    SERVER_PORT=$TEST_SERVER_PORT NODE_ENV=production npm start > "$RUNTIME_OUTPUT" 2>&1 &
    SERVER_PID=$!
    
    # Start sidecar
    print_step "Starting sidecar on port $TEST_SIDECAR_PORT..."
    cd "$ROOT_DIR/apps/sidecar"
    SIDECAR_PORT=$TEST_SIDECAR_PORT NODE_ENV=production npm start >> "$RUNTIME_OUTPUT" 2>&1 &
    SIDECAR_PID=$!
    
    # Start frontend (Next.js production server) - use isolated build directory
    print_step "Starting frontend on port $TEST_FRONTEND_PORT (using .next-build)..."
    cd "$ROOT_DIR/apps/frontend"
    
    # Next.js start looks for .next by default, so we need to create a symlink
    # Save original .next if it exists (not a symlink)
    if [[ -e ".next" ]] && [[ ! -L ".next" ]]; then
        had_original_next=true
        mv .next .next.original 2>/dev/null || true
    fi
    
    # Create symlink from .next to .next-build for runtime test
    if [[ ! -e ".next" ]]; then
        ln -s .next-build .next 2>/dev/null || true
    fi
    
    PORT=$TEST_FRONTEND_PORT NODE_ENV=production npm start >> "$RUNTIME_OUTPUT" 2>&1 &
    FRONTEND_PID=$!
    
    # Wait for servers to start (check if processes are still alive)
    print_step "Waiting for servers to start..."
    sleep 2
    
    # Check if processes are still running
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        print_error "Server process died immediately after start"
        runtime_failed=true
    fi
    if ! kill -0 "$SIDECAR_PID" 2>/dev/null; then
        print_error "Sidecar process died immediately after start"
        runtime_failed=true
    fi
    if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
        print_error "Frontend process died immediately after start"
        runtime_failed=true
    fi
    
    if [[ "$runtime_failed" == true ]]; then
        echo ""
        echo -e "${CYAN}Server output:${NC}"
        tail -30 "$RUNTIME_OUTPUT" 2>/dev/null || true
        stop_test_servers
        cleanup_next_symlink
        return 1
    fi
    
    # Give servers more time to fully start
    sleep 3
    
    # Test server health
    print_step "Testing server health endpoint..."
    if wait_for_server "http://localhost:$TEST_SERVER_PORT/health"; then
        local server_response=$(curl -s "http://localhost:$TEST_SERVER_PORT/health" 2>/dev/null)
        if echo "$server_response" | grep -q '"status":"ok"'; then
            print_success "Server health check passed"
        else
            print_error "Server health check failed: unexpected response: $server_response"
            runtime_failed=true
        fi
    else
        print_error "Server failed to start or respond on port $TEST_SERVER_PORT"
        runtime_failed=true
    fi
    
    # Test sidecar health
    print_step "Testing sidecar health endpoint..."
    if wait_for_server "http://localhost:$TEST_SIDECAR_PORT/health"; then
        local sidecar_response=$(curl -s "http://localhost:$TEST_SIDECAR_PORT/health" 2>/dev/null)
        if echo "$sidecar_response" | grep -q '"status":"ok"'; then
            print_success "Sidecar health check passed"
        else
            print_error "Sidecar health check failed: unexpected response: $sidecar_response"
            runtime_failed=true
        fi
    else
        print_error "Sidecar failed to start or respond on port $TEST_SIDECAR_PORT"
        runtime_failed=true
    fi
    
    # Test frontend (check if it responds)
    print_step "Testing frontend server..."
    if wait_for_server "http://localhost:$TEST_FRONTEND_PORT"; then
        local frontend_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$TEST_FRONTEND_PORT" 2>/dev/null)
        if [[ "$frontend_status" == "200" ]] || [[ "$frontend_status" == "404" ]] || [[ "$frontend_status" == "307" ]] || [[ "$frontend_status" == "308" ]]; then
            # 200 is good, 404/307/308 might be expected (redirects, etc.)
            print_success "Frontend server responding (HTTP $frontend_status)"
        else
            print_error "Frontend returned unexpected status: $frontend_status"
            runtime_failed=true
        fi
    else
        print_error "Frontend failed to start or respond on port $TEST_FRONTEND_PORT"
        runtime_failed=true
    fi
    
    # Stop test servers
    print_step "Stopping test servers..."
    stop_test_servers
    cleanup_next_symlink
    
    if [[ "$runtime_failed" == true ]]; then
        print_error "Runtime tests failed"
        echo ""
        echo -e "${CYAN}Last 30 lines of server output:${NC}"
        tail -30 "$RUNTIME_OUTPUT" 2>/dev/null || true
        return 1
    else
        print_success "All runtime tests passed"
        return 0
    fi
}

# Git commit and push
git_commit_and_push() {
    local commit_message="$1"
    local skip_confirm="${2:-false}"
    
    print_header "Git Commit & Push"
    
    cd "$ROOT_DIR"
    
    # Show current git status
    print_step "Current git status:"
    echo ""
    git status --short
    echo ""
    
    # Check if there are changes to commit
    if [[ -z $(git status --porcelain) ]]; then
        print_warning "No changes to commit"
        return 0
    fi
    
    # If no commit message provided, prompt for one
    if [[ -z "$commit_message" ]]; then
        echo -e "${CYAN}Enter commit message (or Ctrl+C to cancel):${NC}"
        read -r commit_message
        if [[ -z "$commit_message" ]]; then
            print_error "Commit message cannot be empty"
            return 1
        fi
    fi
    
    # Stage all changes
    print_step "Staging all changes..."
    git add .
    
    # Show what will be committed
    echo ""
    print_step "Changes to be committed:"
    git diff --cached --stat
    echo ""
    
    # Confirm before pushing (unless --yes flag is set)
    if [[ "$skip_confirm" != "true" ]]; then
        echo -e "${YELLOW}Ready to commit and push with message:${NC}"
        echo -e "${CYAN}  \"$commit_message\"${NC}"
        echo ""
        echo -e "${YELLOW}Press Enter to continue or Ctrl+C to cancel...${NC}"
        read -r
    else
        echo -e "${CYAN}Committing and pushing with message:${NC}"
        echo -e "${CYAN}  \"$commit_message\"${NC}"
        echo ""
    fi
    
    # Commit
    print_step "Committing changes..."
    if git commit -m "$commit_message"; then
        print_success "Changes committed"
    else
        print_error "Commit failed"
        return 1
    fi
    
    # Push
    print_step "Pushing to remote..."
    if git push; then
        print_success "Pushed to remote"
    else
        print_error "Push failed"
        return 1
    fi
    
    echo ""
    echo -e "${GREEN}${BOLD}Changes committed and pushed successfully!${NC}"
    return 0
}

# Print final summary
print_summary() {
    print_header "Build Summary"
    
    # Successes
    if [[ ${#SUCCESSES[@]} -gt 0 ]]; then
        echo -e "${GREEN}${BOLD}Passed:${NC}"
        for success in "${SUCCESSES[@]}"; do
            echo -e "  ${GREEN}✓${NC} $success"
        done
        echo ""
    fi
    
    # Warnings
    if [[ ${#WARNINGS[@]} -gt 0 ]]; then
        echo -e "${YELLOW}${BOLD}Warnings:${NC}"
        for warning in "${WARNINGS[@]}"; do
            echo -e "  ${YELLOW}⚠${NC} $warning"
        done
        echo ""
    fi
    
    # Missing env vars from turbo.json
    if [[ ${#MISSING_ENV_VARS[@]} -gt 0 ]]; then
        echo -e "${YELLOW}${BOLD}Missing Environment Variables in turbo.json:${NC}"
        echo -e "${YELLOW}  These vars are set but not declared in turbo.json build.env:${NC}"
        for env_var in "${MISSING_ENV_VARS[@]}"; do
            echo -e "  ${YELLOW}→${NC} $env_var"
        done
        echo ""
        echo -e "${CYAN}  To fix, add these to turbo.json under tasks.build.env:${NC}"
        echo -e "${CYAN}  ${NC}"
        for env_var in "${MISSING_ENV_VARS[@]}"; do
            echo -e "${CYAN}    \"$env_var\",${NC}"
        done
        echo ""
    fi
    
    # Errors
    if [[ ${#ERRORS[@]} -gt 0 ]]; then
        echo -e "${RED}${BOLD}Errors:${NC}"
        for error in "${ERRORS[@]}"; do
            echo -e "  ${RED}✗${NC} $error"
        done
        echo ""
    fi
    
    # Final status
    echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
    
    local total_issues=$((${#ERRORS[@]} + ${#WARNINGS[@]} + ${#MISSING_ENV_VARS[@]}))
    
    if [[ ${#ERRORS[@]} -gt 0 ]]; then
        echo -e "${RED}${BOLD}BUILD FAILED${NC} - ${#ERRORS[@]} error(s), ${#WARNINGS[@]} warning(s)"
        echo ""
        echo -e "${CYAN}Common fixes:${NC}"
        echo -e "  • Stale cache: ${YELLOW}rm -rf apps/frontend/.next${NC}"
        echo -e "  • Turbo cache: ${YELLOW}rm -rf node_modules/.cache/turbo${NC}"
        echo -e "  • Force rebuild: ${YELLOW}npm run build -- --force${NC}"
        return 1
    elif [[ ${#WARNINGS[@]} -gt 0 ]] || [[ ${#MISSING_ENV_VARS[@]} -gt 0 ]]; then
        echo -e "${YELLOW}${BOLD}BUILD PASSED WITH WARNINGS${NC} - ${#WARNINGS[@]} warning(s), ${#MISSING_ENV_VARS[@]} env var(s) to declare"
        echo ""
        echo -e "${CYAN}To fix env warnings, add missing vars to turbo.json${NC}"
        return 2
    else
        echo -e "${GREEN}${BOLD}BUILD PASSED${NC} - All checks successful"
        return 0
    fi
}

# Main execution
main() {
    print_header "Monorepo Build Check"
    echo "Starting build checks at $(date)"
    echo "Root directory: $ROOT_DIR"
    echo ""
    
    local build_failed=false
    local lint_failed=false
    local typecheck_failed=false
    local runtime_failed=false
    
    # Check for common issues first
    check_common_issues
    
    # Run build
    if ! run_build; then
        build_failed=true
    fi
    
    # Run lint (even if build failed, to get full picture)
    if ! run_lint; then
        lint_failed=true
    fi
    
    # Run type check
    if ! run_typecheck; then
        typecheck_failed=true
    fi
    
    # Run runtime tests (only if build succeeded and not skipped)
    if [[ "$RUNTIME_ONLY" == true ]]; then
        # Runtime-only mode: just run runtime tests
        if ! run_runtime_tests; then
            runtime_failed=true
        fi
    elif [[ "$SKIP_RUNTIME" == false ]] && [[ "$build_failed" == false ]]; then
        if ! run_runtime_tests; then
            runtime_failed=true
        fi
    elif [[ "$SKIP_RUNTIME" == true ]]; then
        print_warning "Skipping runtime tests (--no-runtime flag)"
    else
        print_warning "Skipping runtime tests (build failed)"
    fi
    
    # Print summary
    print_summary
    local summary_exit=$?
    
    # Return appropriate exit code
    if [[ "$build_failed" == true ]] || [[ "$lint_failed" == true ]] || [[ "$typecheck_failed" == true ]] || [[ "$runtime_failed" == true ]]; then
        return 1
    fi
    
    return $summary_exit
}

# Parse arguments
PUSH_MODE=false
COMMIT_MESSAGE=""
SKIP_CONFIRM=false
SKIP_RUNTIME=false
RUNTIME_ONLY=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --help, -h         Show this help message"
            echo "  --build-only       Run only the build step"
            echo "  --lint-only        Run only the lint step"
            echo "  --type-only        Run only the type check step"
            echo "  --runtime-only     Run only the runtime tests (requires successful build)"
            echo "  --no-runtime       Skip runtime tests"
            echo "  --push             After successful build, commit and push to git"
            echo "  -m \"message\"       Commit message (use with --push)"
            echo "  --yes              Skip confirmation prompt (use with --push)"
            echo ""
            echo "Examples:"
            echo "  $0                           Run all checks"
            echo "  $0 --push                    Run checks, then commit/push interactively"
            echo "  $0 --push -m \"fix: bug\"      Run checks, then commit/push with message"
            echo "  $0 --push -m \"fix: bug\" --yes Run checks, commit/push without confirmation"
            echo ""
            echo "Exit codes:"
            echo "  0 - All checks passed"
            echo "  1 - One or more checks failed"
            echo "  2 - Checks passed with warnings"
            exit 0
            ;;
        --build-only)
            run_build
            print_summary
            exit $?
            ;;
        --lint-only)
            run_lint
            print_summary
            exit $?
            ;;
        --type-only)
            run_typecheck
            print_summary
            exit $?
            ;;
        --runtime-only)
            RUNTIME_ONLY=true
            shift
            ;;
        --no-runtime)
            SKIP_RUNTIME=true
            shift
            ;;
        --push)
            PUSH_MODE=true
            shift
            ;;
        -m)
            shift
            COMMIT_MESSAGE="$1"
            shift
            ;;
        --yes)
            SKIP_CONFIRM=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main with optional push
main

# Get the exit code from main
EXIT_CODE=$?

# If push mode and build passed (exit 0 or 2 with only informational warnings), do git operations
if [[ "$PUSH_MODE" == true ]]; then
    if [[ $EXIT_CODE -eq 0 ]]; then
        git_commit_and_push "$COMMIT_MESSAGE" "$SKIP_CONFIRM"
        exit $?
    elif [[ $EXIT_CODE -eq 2 ]]; then
        # Check if warnings are only informational (like .next directory warning)
        # If no actual code warnings, allow push
        has_code_warnings=false
        for warning in "${WARNINGS[@]}"; do
            if [[ "$warning" != *".next directory"* ]] && [[ "$warning" != *"env var"* ]]; then
                has_code_warnings=true
                break
            fi
        done
        
        if [[ "$has_code_warnings" == false ]]; then
            echo ""
            echo -e "${CYAN}Build passed with informational warnings only. Proceeding with push...${NC}"
            git_commit_and_push "$COMMIT_MESSAGE" "$SKIP_CONFIRM"
            exit $?
        else
            echo ""
            echo -e "${YELLOW}Build passed with code warnings. Fix warnings before pushing.${NC}"
            echo -e "${YELLOW}Run without --push to see details, or fix and re-run.${NC}"
            exit 2
        fi
    else
        echo ""
        echo -e "${RED}Build failed. Fix errors before pushing.${NC}"
        exit 1
    fi
fi

exit $EXIT_CODE
