const ShowError = ({ msg, reset }: { msg?: string; reset?: () => void }) => {
  return (
    <div>
      <h2>Error</h2>
      <p>{msg || "something went wrong!"}</p>
      {reset && (
        <button
          onClick={
            // Attempt to recover by trying to re-render the segment
            () => reset()
          }
        >
          Try again
        </button>
      )}
    </div>
  );
};

export { ShowError };
