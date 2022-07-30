const Error = ({ msg }: { msg: Error }) => {
  return (
    <div>
      <h1>Error</h1>
      <p>{msg.message}</p>
    </div>
  );
};

export { Error };
