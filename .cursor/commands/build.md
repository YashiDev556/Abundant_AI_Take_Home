Run the build check script to verify all checks pass (build, lint, type-check, and runtime tests).

## Command

```bash
./scripts/build-check.sh
```

## Isolated Build Directory

The build-check script uses an **isolated build directory** (`.next-build`) for the Next.js frontend build. This means:

- The build runs in `.next-build` instead of `.next`
- Your running dev server (which uses `.next`) is **not affected**
- You can run build checks without restarting your dev server
- All packages are still fully checked (nothing is excluded)

## Runtime Tests

The script now includes **runtime tests** that:

- Start production servers (server, sidecar, frontend) on isolated test ports (5000, 5001, 5002)
- Test health endpoints to verify servers start correctly
- Verify all services respond properly
- Automatically clean up test servers after testing

**Test ports (won't conflict with dev):**
- Server: `5000` (dev uses `4000`)
- Sidecar: `5001` (dev uses `4001`)
- Frontend: `5002` (dev uses `3000`)

## Process

1. **Run all checks** - Build, lint, type-check, and runtime tests (in isolated directory)
2. **Review results** - If any errors, fix them and re-run
3. **No auto-commit** - This script only checks, it does not commit or push

## Options

```bash
# Run all checks (default)
./scripts/build-check.sh

# Skip runtime tests
./scripts/build-check.sh --no-runtime

# Run only runtime tests (requires successful build first)
./scripts/build-check.sh --runtime-only

# Run only specific checks
./scripts/build-check.sh --build-only
./scripts/build-check.sh --lint-only
./scripts/build-check.sh --type-only
```

## Safety

- Dev server keeps running (build uses isolated `.next-build` directory)
- Test servers use different ports (won't conflict with dev)
- All test servers are automatically cleaned up after testing
- No git operations (use `build-and-push.md` for that)

## Loop Until Clean

If any check fails:
1. Review the error summary
2. Fix the issues
3. Run `./scripts/build-check.sh` again
4. Repeat until all checks pass

## What Gets Tested

- **Build**: Compiles all packages and apps
- **Lint**: Checks code style and quality
- **Type-check**: Verifies TypeScript types
- **Runtime**: Starts production servers and tests health endpoints
