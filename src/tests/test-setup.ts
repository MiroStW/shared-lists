import { cleanup } from "@tests/test-utils";
import { afterEach, beforeEach } from "bun:test";

beforeEach(() => {
  // eslint-disable-next-line no-restricted-globals
  location.replace(`http://localhost:3000`);
});

afterEach(() => {
  cleanup();
});
