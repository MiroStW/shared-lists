const setSessionCookie = async (idToken: string) => {
  const res = await fetch("/api/sessionlogin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      idToken,
    }),
  });
  return res;
};

export { setSessionCookie };
