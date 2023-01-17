"use client";

import { useEffect } from "react";
import { ShowError } from "./shared/ShowError";

const Error = ({ error, reset }: { error: Error; reset: () => void }) => {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return <ShowError msg={error.message} reset={reset} />;
};

export default Error;
