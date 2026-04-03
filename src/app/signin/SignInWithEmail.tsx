"use client";

import { TextField } from "@mui/material";
import { Loading } from "app/shared/Loading";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import styles from "./signIn.module.css";
import { signIn } from "next-auth/react";

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
  const router = useRouter();
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<Inputs>();

  const onSubmit = async (data: Inputs) => {
    try {
      setIsLoading(true);
      setError("");
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setIsLoading(false);
      } else {
        setIsLoading(false);
        router.push("/lists");
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || "An error occurred");
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
            Sign-in
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
      {error && <div style={{ color: "red", marginTop: "1rem" }}>Error: {error}</div>}
    </>
  );
};

export default SignInWithEmail;
