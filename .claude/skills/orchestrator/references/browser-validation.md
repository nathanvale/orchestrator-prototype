# Browser Validation Reference

Technical reference for browser validation using the agent-browser CLI. Read this when implementing or debugging the browser validation protocol in Step 10 of SKILL.md.

---

## What agent-browser Is

`agent-browser` is Vercel's token-efficient browser automation CLI, designed specifically for AI agents operating in browser environments. It provides a command-line interface to a headless Chromium browser, returning only what the agent explicitly requests rather than serializing the entire DOM.

Install:
```bash
npm install -g agent-browser
# or use via npx (no install needed)
npx agent-browser --version
```

---

## Why agent-browser Over Playwright MCP

| Approach | Context Usage | Why |
|----------|---------------|-----|
| Playwright MCP (full DOM) | ~15,000-25,000 tokens per page check | Serializes the entire DOM tree, all attributes, all text content |
| agent-browser (targeted) | ~500-2,000 tokens per check | Returns only what the agent queries: screenshot, element text, selector style |

The 93% context reduction is critical for browser validation inside an orchestration run. The orchestrator is already holding the full task graph, spec file, and execution history in context. Adding a 20,000-token DOM dump for every UI task would exhaust the context window on multi-task waves.

---

## Command Reference

### navigate

```bash
npx agent-browser navigate <url>
```

Navigates to the specified URL. Waits for the page to reach `DOMContentLoaded` state before returning.

Example:
```bash
npx agent-browser navigate http://localhost:3000/profile
```

### screenshot

```bash
npx agent-browser screenshot --output <path>
```

Takes a full-page screenshot and saves it to the specified path. Returns the path on success.

Example:
```bash
npx agent-browser screenshot --output /tmp/browser-val-profile-card.png
```

Naming convention for orchestration screenshots:
- Initial validation: `/tmp/browser-val-<taskId>.png`
- Ralph Wiggum loop iterations: `/tmp/browser-val-<taskId>-attempt-<n>.png`

### evaluate

```bash
npx agent-browser evaluate '<css-selector>'
```

Returns the computed style, text content, and bounding box of the matched element. Does NOT return the full DOM -- only the queried element's properties.

Example:
```bash
npx agent-browser evaluate '.profile-card .avatar'
# Returns: { text: "", bounds: { top: 24, left: 24, width: 64, height: 64 }, display: "block" }
```

Use `evaluate` for specific element checks in the browser validator's prompt when screenshot analysis alone is not sufficient (e.g., verifying computed CSS values, confirming text content).

---

## Screenshot Strategy

### When to Screenshot

Take a screenshot immediately after navigating to the relevant page or component path. Do not screenshot before navigation or before the DOM has loaded.

**Good:** Navigate, wait for DOMContentLoaded, screenshot.
**Bad:** Screenshot immediately after build (no dev server running). Screenshot a loading spinner.

### Ensuring the Component is Rendered

Before screenshotting, verify the target element exists:

```bash
npx agent-browser evaluate '<target-selector>'
```

If the element is not found, wait 2 seconds and retry once before accepting the "not rendered" state. Some frameworks (React, Vue) have an async hydration phase.

### Naming Convention

All orchestration screenshots follow a predictable naming scheme so the orchestrator and builder can reference them by taskId:

```
/tmp/browser-val-<taskId>.png              -- initial browser validation screenshot
/tmp/browser-val-<taskId>-attempt-<n>.png  -- Ralph Wiggum loop attempt N
```

Where `<taskId>` is the numeric task ID from TaskCreate (e.g., `browser-val-3.png`, `browser-val-3-attempt-1.png`).

### What the Builder Sees

When the Ralph Wiggum loop re-dispatches the builder, the prompt includes a file reference to the screenshot (not base64-encoded). The builder's agent runtime reads the PNG file directly. This keeps context window usage bounded.

---

## Dev Server Lifecycle

### Starting the Dev Server

Before the first browser validation in an orchestration run:

1. Check if a dev server is already running: `curl -s http://localhost:3000 > /dev/null && echo "running" || echo "not running"`
2. If not running, read `DEV_SERVER_CMD` from the HOP Configuration.
3. Start the dev server in the background and record the PID:

```bash
# Example DEV_SERVER_CMD: "bun run dev"
bun run dev &
DEV_SERVER_PID=$!
```

4. Poll for readiness (up to 10 seconds):
```bash
for i in $(seq 1 10); do
  curl -s http://localhost:3000 > /dev/null && echo "ready" && break || sleep 1
done
```

5. If not ready after 10 seconds: emit `browser.skipped` with reason "dev server failed to start". Set BROWSER_ENABLED to false for all remaining tasks.

### Keeping the Dev Server Running

The dev server is a shared resource for the entire orchestration run. Do NOT restart it between tasks or waves. Starting and stopping Bun/Vite/Next dev servers takes 3-10 seconds each time and can cause port conflicts.

Emit `devserver.started` once when the server is first confirmed ready.

### Stopping the Dev Server

After all waves complete (Step 12), if `devserver.started` was emitted during this run:

```bash
kill $DEV_SERVER_PID
```

Emit `devserver.stopped` with the PID. If the process is already gone (crashed or user-terminated), emit the event anyway and continue.

---

## Token Efficiency Tips

1. **Use screenshot-first validation.** Ask the browser validator to analyze the screenshot and report findings before resorting to `evaluate` calls. Most visual issues (missing elements, layout problems, styling errors) are diagnosable from a screenshot.

2. **Never dump the full DOM.** Do not use generic DOM serialization. If you need to check a specific value, use `evaluate` with a precise CSS selector.

3. **Keep validator prompts tight.** The browser validator prompt should reference specific acceptance criteria from the spec file, not ask for a general "visual review". Focused prompts produce shorter, more actionable responses.

4. **Use binary file references for screenshots.** Pass the screenshot path (e.g., `/tmp/browser-val-3.png`) to the builder in the Ralph Wiggum loop, not a base64-encoded string. The agent runtime reads the file directly. Base64-encoding a 1MB PNG adds ~1.3MB of tokens.

---

## Integration with the Ralph Wiggum Loop

The Ralph Wiggum loop uses browser validation as its core feedback mechanism:

```
1. Browser validator takes screenshot -> FAIL failure_mode:visual
2. Orchestrator re-dispatches builder with:
   - Screenshot path reference
   - Failure description (exact text from validator's FAIL report)
   - Running summary of previous fix attempts
3. Builder reads screenshot, identifies visual issue, fixes CSS/layout/markup
4. Orchestrator takes a new screenshot (next attempt number)
5. Browser validator re-validates from new screenshot
6. Repeat up to 3 times
```

The key invariant: **every iteration of the loop uses the most recent screenshot**. The builder does not receive historical screenshots from previous attempts -- only the current state. The fix attempt summary provides context about what has been tried without burdening the context window with multiple screenshots.

---

## Failure Modes and Fixes

| Failure Mode | Symptom | Fix |
|--------------|---------|-----|
| Screenshot taken before render | Shows loading spinner or blank page | Add `evaluate` check for target element before screenshotting. Add 1-second wait if element not found. |
| Dev server not started | `curl: connection refused` in browser validate step | Always run the dev server readiness check before dispatching the browser validator. |
| `--no-browser` flag ignored | Browser validation runs in CI without display | Check BROWSER_ENABLED before any `agent-browser` call. |
| Screenshot path not passed to builder | Builder receives only text description of visual issue | Always include screenshot path reference in Ralph Wiggum re-dispatch prompt. |
| Dev server not stopped after run | Stale dev server process on port 3000 | Record PID on `devserver.started`, send `kill <PID>` in Step 12 cleanup. |
| Ralph Wiggum loop runs for non-visual failures | Code error (missing export, type error) routed into visual retry | Only enter Ralph Wiggum loop on `failure_mode:visual`. Route `failure_mode:error` and `failure_mode:functional` to Step 11 (standard retry). |

---

## Related References

| File | What It Covers |
|------|---------------|
| `references/hitl-protocol.md` | HITL escalation -- used when Ralph Wiggum loop exhausts 3 iterations |
| `references/dag-execution.md` | Wave computation -- browser validation runs within the wave execution loop |
| `references/codex-escalation.md` | Difficulty routing -- browser validation is independent of Codex routing |
| `docs/patterns/browser-validation.md` | Pattern-level explanation: what, when, how |
| `docs/patterns/ralph-wiggum-loop.md` | Pattern-level explanation of the visual retry cycle |
