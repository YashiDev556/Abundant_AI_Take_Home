Run the build check script and if all checks pass, commit and push to git.

## IMPORTANT: Always provide a commit message

You MUST provide a commit message using the `-m` flag. The script does not work well with interactive prompts.

**Before running the script:**
1. Run `git status` and `git diff --stat` to understand what changed
2. Review recent commits with `git log --oneline -5` to match the commit style
3. Write an appropriate commit message summarizing the changes

## Command

```bash
./scripts/build-check.sh --push -m "your commit message here"
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
3. **Auto-commit and push** - If all checks pass (exit code 0), automatically:
   - Stage all changes (`git add .`)
   - Commit with your message
   - Push to remote

## Example Usage

```bash
# Good - always include commit message
./scripts/build-check.sh --push -m "feat: add new feature"

# Good - multi-line commit messages
./scripts/build-check.sh --push -m "fix: resolve login issue

- Update auth handler to check token expiry
- Add retry logic for failed requests"
```

## Safety

- Only commits/pushes if ALL checks pass (exit 0)
- Shows git status before committing so you can review
- Prompts for confirmation before pushing
- Dev server keeps running (build uses isolated `.next-build` directory)
- Test servers use different ports (won't conflict with dev)
- All test servers are automatically cleaned up after testing

## Loop Until Clean

If the build fails:
1. Review the error summary
2. Fix the issues
3. Run `./scripts/build-check.sh --push -m "message"` again
4. Repeat until BUILD PASSED

Once passed, your changes are committed and pushed automatically.
