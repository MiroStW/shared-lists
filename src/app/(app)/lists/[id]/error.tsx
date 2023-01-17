"use client";

import { ShowError } from "app/shared/ShowError";
import { useEffect } from "react";

const Error = ({ error, reset }: { error: Error; reset: () => void }) => {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return <ShowError msg={error.message} reset={reset} />;
};

export default Error;
