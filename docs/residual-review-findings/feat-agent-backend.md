# Residual Review Findings: feat/agent-backend

Source: ce-code-review run `20261031-090952-126bfc0b` (mode:agent, 12 reviewers, validator batch of 14). Verdict: Ready with fixes. These validated findings were not applied by the pipeline: they change permission scope, need a schema change, or rest on a single reviewer. No tracker tickets were filed.

## Residual Review Findings

None open. The four findings below were fixed after merge, in `fix/residual-review-findings`:

- P2 `src/server/agent/listAgent.ts` A question whose chosen option fails unexpectedly is reopened, so it can be answered again.
- P2 `test/lists/access.test.ts` A household is denied reads and writes on a list, item or section that only one member sees.
- P3 `src/server/agent/limits.ts` The daily limit counts only the entry command of a sentence (`Command.sentence`), not its later change commands.
- P3 `src/server/lists/undo.ts` Undo of a section move records the restored section on the inverse event.

## Fixed before merge

- Household accesses see and answer only questions asked through the same access.
- A household access left with fewer than two members stops authenticating (401).
- Undo picks the command that wrote the newest event, so an answer to a question is undone before a later change.
- The live stream reopens with a growing delay (1 s up to 30 s) after the server refused it.
- Model calls time out after 30 s with one retry.

## Design notes (report-only)

- Household undo of a command spanning shared and private lists marks it `partial`; the hidden remainder can then not be undone by its author (plan KTD4.3/4.5). Flagged by security and adversarial reviewers, ruled design by the validator.
- `x-acting-user` is trusted by design (KTD2): a household token holder can act as another member.
