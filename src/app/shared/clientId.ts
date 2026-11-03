// A random id per browser tab. Write requests carry it in `x-sl-client`, and
// the live update stream echoes it back, so a tab can skip the changes it
// caused itself (KTD8). It lives in module scope: a reload or a duplicated tab
// gets a new id, unlike sessionStorage, which a duplicated tab copies.
const CLIENT_ID_HEADER = "x-sl-client";

let clientId: string | undefined;

export const getClientId = () => {
  if (!clientId) {
    // crypto.randomUUID needs a secure context; getRandomValues does not.
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    clientId = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return clientId;
};

// fetch() for requests that change data: adds the tab id header.
export const fetchWrite = (input: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set(CLIENT_ID_HEADER, getClientId());
  return fetch(input, { ...init, headers });
};
