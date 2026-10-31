# Residual Review Findings: feat/agent-backend

Source: ce-code-review run `20261031-090952-126bfc0b` (mode:agent, 12 reviewers, validator batch of 14). Verdict: Ready with fixes. These validated findings were not applied by the pipeline: they change permission scope, need a schema change, or rest on a single reviewer. No tracker tickets were filed.

## Residual Review Findings

- P2 `src/server/agent/clarifications.ts:45` Household actor reads and answers another channel's private clarification. Clarification ownership matches the acting person only, so a household token with `x-acting-user` sees and can answer that person's private question. Fix: for household actors also match `accessId`.
- P2 `src/server/auth/agentAuth.ts:67` Household access widens to a lone member's lists. Deleting a non-creator member leaves a one-member household that then sees the creator's private lists. Fix: reject households with fewer than two members in `actorFromAgentToken`; consider a cleanup-script blocker.
- P2 `src/server/lists/undo.ts:90` Undo after a clarification answer reverts a later, unrelated command. Answers append to the asking command, but undo picks the newest command by `createdAt`. Fix: pick the command of the newest eligible `ListEvent` by `seq`.
- P2 `src/app/shared/useLiveUpdates.ts:25` EventSource is never reopened after a fatal stream error (non-200 on reconnect). Fix: on `CLOSED`, reset `source` and reopen with capped backoff while subscribers exist.
- P2 `src/server/agent/anthropicClient.ts:34` Model call has no timeout or abort propagation. Fix: `new Anthropic({ apiKey, timeout: 30_000, maxRetries: 1 })`, optionally pass the request signal.
- P2 `src/server/agent/listAgent.ts:454` Clarification is consumed before its stored tool call runs; an unexpected failure loses the question. Fix: reset `resolvedAt` on the rethrow path.
- P2 `src/server/lists/access.ts:62` In-memory household visibility checks have no negative tests (item, section, list visible to only one member). Fix: add forbidden-path household tests.
- P3 `src/server/agent/listAgent.ts:306` Daily limit counts follow-up commands of one sentence (after undo, or an answer to an undone sentence) as extra sentences. Fix: mark only entry commands as sentences.
- P3 `src/server/lists/undo.ts:214` Undo of a section move records the wrong `sectionId` on the inverse event. Fix: use the restored section id for `item.section_set`.

## Design notes (report-only)

- Household undo of a command spanning shared and private lists marks it `partial`; the hidden remainder can then not be undone by its author (plan KTD4.3/4.5). Flagged by security and adversarial reviewers, ruled design by the validator.
- `x-acting-user` is trusted by design (KTD2): a household token holder can act as another member.
