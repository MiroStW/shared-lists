import { describe, expect, test } from "bun:test";
import { prisma } from "db/prisma";
import { resetDatabase } from "./setup/db";
import { setSessionUser } from "./setup/session";
import { resolveTestDatabaseUrl } from "./setup/env";
import getServerSession from "auth/getServerSession";

describe("test database guard", () => {
  test("refuses to run without TEST_DATABASE_URL", () => {
    expect(() => resolveTestDatabaseUrl({})).toThrow(
      "TEST_DATABASE_URL is not set",
    );
  });

  test('refuses a database name without "test"', () => {
    expect(() =>
      resolveTestDatabaseUrl({
        TEST_DATABASE_URL: "postgresql://user:pw@localhost:5432/shared_lists",
      }),
    ).toThrow('does not contain "test"');
  });

  test('refuses when only the host or user contains "test"', () => {
    expect(() =>
      resolveTestDatabaseUrl({
        TEST_DATABASE_URL: "postgresql://test:pw@testhost:5432/shared_lists",
      }),
    ).toThrow('does not contain "test"');
  });

  test("accepts a test database and points DATABASE_URL at it", () => {
    const url = "postgresql://user:pw@localhost:5432/shared_lists_test";
    expect(resolveTestDatabaseUrl({ TEST_DATABASE_URL: url })).toBe(url);
    expect(process.env.DATABASE_URL).toBe(process.env.TEST_DATABASE_URL!);
  });
});

describe("resetDatabase", () => {
  test("empties app tables", async () => {
    await prisma.user.create({
      data: { id: "reset-user", email: "reset@example.test" },
    });
    await resetDatabase();
    expect(await prisma.user.count()).toBe(0);
  });
});

describe("session mock", () => {
  test("returns the user set by the test", async () => {
    setSessionUser({ id: "u1", email: "u1@example.test" });
    expect(await getServerSession()).toEqual({
      user: { id: "u1", email: "u1@example.test" },
    });
  });

  // Runs after the test above: the preload clears the user after each test.
  test("returns an error without a user", async () => {
    expect(await getServerSession()).toEqual({ error: "No user found" });
  });
});
