"use client";

import { TextField } from "@mui/material";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import SignInWithEmail from "./SignInWithEmail";
import SignUpWithEmail from "./SignUpWithEmail";
import styles from "./signIn.module.css";
import { Loading } from "app/shared/Loading";

interface Inputs {
  email: string;
}

const SignInEnterEmail = ({
  email,
  setEmail,
}: {
  email: string | undefined;
  setEmail: Dispatch<SetStateAction<string | undefined>>;
}) => {
  const [userExists, setUserExists] = useState<boolean>();
  const [isLoading, setIsLoading] = useState(false);

  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<Inputs>();

  const onSubmit = async (data: Inputs) => {
    setIsLoading(true);
    setEmail(data.email);
    try {
      const response = await fetch(`/api/user/exists?email=${encodeURIComponent(data.email)}`);
      const result = await response.json();
      setUserExists(result.exists);
    } catch (err) {
      console.error("Failed to check user existence:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {userExists === undefined && (
        <form className={styles.signInForm} onSubmit={handleSubmit(onSubmit)}>
          <Controller
            name="email"
            control={control}
            defaultValue={""}
            render={({ field }) => (
              <TextField
                {...field}
                id="email"
                label="E-Mail"
                type="email"
                variant="outlined"
                fullWidth
                size="small"
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            )}
            rules={{
              required: "E-mail is required",
              pattern: {
                value: /^\S+@\S+$/i,
                message: "Invalid e-mail address",
              },
            }}
          />
          <button
            className={`primary ${styles.signInOptionButton}`}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? <Loading size={20} inline /> : "next"}
          </button>
        </form>
      )}
      {userExists === false && (
        <SignUpWithEmail
          email={email}
          setEmail={setEmail}
          setUserExists={setUserExists}
        />
      )}
      {userExists === true && (
        <SignInWithEmail
          email={email}
          setEmail={setEmail}
          setUserExists={setUserExists}
        />
      )}
    </>
  );
};

export default SignInEnterEmail;
