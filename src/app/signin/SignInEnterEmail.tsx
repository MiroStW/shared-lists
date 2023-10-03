"use client";

import { TextField } from "@mui/material";
import { useClientSession } from "app/sessionContext";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import SignInWithEmail from "./SignInWithEmail";
import SignUpWithEmail from "./SignUpWithEmail";
import styles from "./signIn.module.css";

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
  const { auth } = useClientSession();
  const [userExists, setUserExists] = useState<boolean>();

  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<Inputs>();

  const onSubmit = async (data: Inputs) => {
    // check if user exists, if not show sign up form, otherweise log in form
    setEmail(data.email);
    const existingSignIns = await fetchSignInMethodsForEmail(auth, data.email);
    if (existingSignIns.includes("password")) {
      setUserExists(true);
    } else {
      setUserExists(false);
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
          >
            next
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
