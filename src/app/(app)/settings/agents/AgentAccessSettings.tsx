"use client";

import {
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
} from "@mui/material";
import { useState } from "react";
import { Modal } from "app/shared/Modal";
import type {
  AgentAccessKind,
  AgentAccessMember,
  AgentAccessSummary,
} from "server/auth/agentAccess";
import { MAX_LABEL_LENGTH } from "server/auth/agentAccessRules";
import styles from "./agentAccess.module.css";

const controlSx = {
  color: "#e8eaed",
  "&.Mui-checked": { color: "rgb(245, 222, 178)" },
};

const memberName = (member: AgentAccessMember) => member.name || member.email;

// Server and browser format dates differently, so the text may differ on
// hydration; the browser's version wins.
const DateText = ({ iso }: { iso: string }) => (
  <time dateTime={iso} suppressHydrationWarning>
    {new Date(iso).toLocaleString()}
  </time>
);

const readError = async (response: Response) => {
  try {
    const body = await response.json();
    if (typeof body.error === "string") return body.error;
  } catch {
    // Not JSON; fall through.
  }
  return `Request failed (${response.status})`;
};

const NewToken = ({
  label,
  token,
  onDone,
}: {
  label: string;
  token: string;
  onDone: () => void;
}) => {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <section className={styles.tokenPanel} aria-label="New token">
      <h2>Token for {label}</h2>
      <p className={styles.warning}>
        This token is shown only once. Copy it now and store it safely.
      </p>
      <code className={styles.token} data-testid="agent-token">
        {token}
      </code>
      <div className={styles.actions}>
        <button type="button" className="primary noMargin" onClick={copy}>
          {copyState === "copied" ? "Copied" : "Copy token"}
        </button>
        <button type="button" className="noMargin" onClick={onDone}>
          Done
        </button>
      </div>
      {copyState === "failed" && (
        <p className={styles.error}>
          Copying failed. Select the token and copy it by hand.
        </p>
      )}
    </section>
  );
};

const AccessRow = ({
  access,
  onRevoke,
}: {
  access: AgentAccessSummary;
  onRevoke: (access: AgentAccessSummary) => void;
}) => (
  <li
    className={`${styles.access} ${access.revokedAt ? styles.revoked : ""}`}
    data-testid="agent-access"
  >
    <div className={styles.accessMain}>
      <div className={styles.accessTitle}>
        <strong>{access.label}</strong>
        <span className={styles.kind}>
          {access.kind === "person" ? "Person" : "Household"}
        </span>
      </div>
      <div className={styles.meta}>
        {access.members.map(memberName).join(", ")}
      </div>
      <div className={styles.meta}>
        Created <DateText iso={access.createdAt} /> · Last used{" "}
        {access.lastUsedAt ? <DateText iso={access.lastUsedAt} /> : "never"}
      </div>
    </div>
    {access.revokedAt ? (
      <span className={styles.meta}>
        Revoked <DateText iso={access.revokedAt} />
      </span>
    ) : (
      <button type="button" className="noMargin" onClick={() => onRevoke(access)}>
        Revoke
      </button>
    )}
  </li>
);

const AgentAccessSettings = ({
  userEmail,
  initialAccesses,
  candidates,
}: {
  userEmail: string;
  initialAccesses: AgentAccessSummary[];
  candidates: AgentAccessMember[];
}) => {
  const [accesses, setAccesses] = useState(initialAccesses);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<AgentAccessKind>("person");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newToken, setNewToken] = useState<{
    label: string;
    token: string;
  } | null>(null);
  const [toRevoke, setToRevoke] = useState<AgentAccessSummary | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const toggleMember = (email: string) =>
    setSelectedEmails((emails) =>
      emails.includes(email)
        ? emails.filter((other) => other !== email)
        : [...emails, email],
    );

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/agent-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          kind,
          memberEmails:
            kind === "household" ? [userEmail, ...selectedEmails] : undefined,
        }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      const created: { access: AgentAccessSummary; token: string } =
        await response.json();
      setAccesses((current) => [created.access, ...current]);
      setNewToken({ label: created.access.label, token: created.token });
      setLabel("");
      setKind("person");
      setSelectedEmails([]);
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const revoke = async () => {
    if (!toRevoke) return;
    setRevokeError(null);
    try {
      const response = await fetch(`/api/agent-access/${toRevoke.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setRevokeError(await readError(response));
        return;
      }
      const { access }: { access: AgentAccessSummary } = await response.json();
      setAccesses((current) =>
        current.map((other) => (other.id === access.id ? access : other)),
      );
      setToRevoke(null);
    } catch {
      setRevokeError("Could not reach the server. Try again.");
    }
  };

  return (
    <div className={styles.page}>
      <h1>Agent access</h1>
      <p className={styles.intro}>
        Agents such as Claude Code or a chat bot use an access token to read and
        change your lists. A household access sees only the lists all its
        members share. The label names the channel of every change the agent
        makes.
      </p>

      {newToken && (
        <NewToken
          label={newToken.label}
          token={newToken.token}
          onDone={() => setNewToken(null)}
        />
      )}

      <section aria-label="New access">
        <h2>New access</h2>
        <form className={styles.form} onSubmit={create}>
          <TextField
            id="agent-access-label"
            label="Label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            size="small"
            required
            helperText="Lowercase letters, digits and dashes, e.g. claude-code"
            slotProps={{
              htmlInput: { maxLength: MAX_LABEL_LENGTH },
              formHelperText: { className: styles.helper },
            }}
          />
          <RadioGroup
            row
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as AgentAccessKind)}
          >
            <FormControlLabel
              value="person"
              control={<Radio sx={controlSx} />}
              label="Just me"
            />
            <FormControlLabel
              value="household"
              control={<Radio sx={controlSx} />}
              label="Household"
            />
          </RadioGroup>
          {kind === "household" && (
            <fieldset className={styles.members}>
              <legend>Household members besides you</legend>
              {candidates.length === 0 ? (
                <p className={styles.meta}>
                  You do not share a list with anyone yet.
                </p>
              ) : (
                candidates.map((candidate) => (
                  <FormControlLabel
                    key={candidate.id}
                    control={
                      <Checkbox
                        sx={controlSx}
                        checked={selectedEmails.includes(candidate.email)}
                        onChange={() => toggleMember(candidate.email)}
                      />
                    }
                    label={`${memberName(candidate)} (${candidate.email})`}
                  />
                ))
              )}
            </fieldset>
          )}
          <div>
            <button
              type="submit"
              className="primary noMargin"
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create access"}
            </button>
          </div>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </form>
      </section>

      <section aria-label="Your accesses">
        <h2>Your accesses</h2>
        {accesses.length === 0 ? (
          <p className={styles.meta}>No accesses yet.</p>
        ) : (
          <ul className={styles.accessList}>
            {accesses.map((access) => (
              <AccessRow
                key={access.id}
                access={access}
                onRevoke={(target) => {
                  setRevokeError(null);
                  setToRevoke(target);
                }}
              />
            ))}
          </ul>
        )}
      </section>

      {toRevoke && (
        <Modal
          setOpenModal={(open) => {
            if (!open) setToRevoke(null);
          }}
          title={`Revoke access "${toRevoke.label}"?`}
        >
          <div className={styles.confirm}>
            <p>Agents using this token lose access immediately.</p>
            {revokeError && <p className={styles.error}>{revokeError}</p>}
            <div className={styles.actions}>
              <button type="button" className="primary noMargin" onClick={revoke}>
                Revoke
              </button>
              <button
                type="button"
                className="noMargin"
                onClick={() => setToRevoke(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export { AgentAccessSettings };
