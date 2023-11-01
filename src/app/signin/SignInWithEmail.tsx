"use client";

import { TextField } from "@mui/material";
import { useClientSession } from "app/sessionContext";
import { Loading } from "app/shared/Loading";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import styles from "./signIn.module.css";
import { updateUser } from "./updateUser";

interface Inputs {
  email: string;
  password: string;
}

const SignInWithEmail = ({
  email = "",
  setEmail,
  setUserExists,
}: {
  email?: string;
  setEmail: Dispatch<SetStateAction<string | undefined>>;
  setUserExists: Dispatch<SetStateAction<boolean | undefined>>;
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const { auth } = useClientSession();
  const router = useRouter();
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<Inputs>();

  const onSubmit = async (data: Inputs) => {
    // check if user exists, if not show sign up form, otherweise log in form
    try {
      setIsLoading(true);
      const { user } = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      if (user) await updateUser(user, auth);
      setIsLoading(false);
      router.push("/lists");
    } catch (err) {
      setIsLoading(false);
      if (typeof err === "string") {
        setError(err);
      } else if (err instanceof FirebaseError) {
        setError(err.code);
      }
    }

    return null;
  };
  return (
    <>
      <h2>Welcome back!</h2>
      {isLoading ? (
        <div style={{ margin: "auto" }}>
          <Loading inline={true} />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className={styles.signInForm}>
          <Controller
            name="email"
            control={control}
            defaultValue={email}
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
          <Controller
            name="password"
            control={control}
            defaultValue={""}
            render={({ field }) => (
              <TextField
                {...field}
                type="password"
                id="password"
                label="Password"
                variant="outlined"
                fullWidth
                size="small"
                error={!!errors.password}
                helperText={errors.password?.message}
              />
            )}
            rules={{
              required: "Password is required",
            }}
          />
          <button
            className={`primary ${styles.signInOptionButton}`}
            type="submit"
          >
            next
          </button>
          <button
            className={styles.signInOptionButton}
            onClick={() => {
              setEmail(undefined);
              setUserExists(undefined);
            }}
          >
            back
          </button>
        </form>
      )}
      {error && <div>Error: {error}</div>}
    </>
  );
};

export default SignInWithEmail;
