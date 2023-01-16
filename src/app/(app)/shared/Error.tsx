const Error = ({ msg }: { msg: string | undefined }) => {
  return (
    <div>
      <h1>Error</h1>
      <p>{msg || "no error message"}</p>
    </div>
  );
};

export { Error };
