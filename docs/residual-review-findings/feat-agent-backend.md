# Residual Review Findings: feat/agent-backend

Source: ce-code-review run `20261031-090952-126bfc0b` (mode:agent, 12 reviewers, validator batch of 14). Verdict: Ready with fixes. These validated findings were not applied by the pipeline: they change permission scope, need a schema change, or rest on a single reviewer. No tracker tickets were filed.

## Residual Review Findings

- P2 `src/server/agent/listAgent.ts:454` Clarification is consumed before its stored tool call runs; an unexpected failure loses the question. Fix: reset `resolvedAt` on the rethrow path.
- P2 `src/server/lists/access.ts:62` In-memory household visibility checks have no negative tests (item, section, list visible to only one member). Fix: add forbidden-path household tests.
- P3 `src/server/agent/listAgent.ts:306` Daily limit counts follow-up commands of one sentence (after undo, or an answer to an undone sentence) as extra sentences. Fix: mark only entry commands as sentences.
- P3 `src/server/lists/undo.ts:214` Undo of a section move records the wrong `sectionId` on the inverse event. Fix: use the restored section id for `item.section_set`.

## Fixed before merge

- Household accesses see and answer only questions asked through the same access.
- A household access left with fewer than two members stops authenticating (401).
- Undo picks the command that wrote the newest event, so an answer to a question is undone before a later change.
- The live stream reopens with a growing delay (1 s up to 30 s) after the server refused it.
- Model calls time out after 30 s with one retry.

## Design notes (report-only)

- Household undo of a command spanning shared and private lists marks it `partial`; the hidden remainder can then not be undone by its author (plan KTD4.3/4.5). Flagged by security and adversarial reviewers, ruled design by the validator.
- `x-acting-user` is trusted by design (KTD2): a household token holder can act as another member.
