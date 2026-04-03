"use client";

import { TextField } from "@mui/material";
import { Loading } from "app/shared/Loading";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import styles from "./signIn.module.css";
import { signIn } from "next-auth/react";

interface Inputs {
  email: string;
  name: string;
  password: string;
  passwordConfirm: string;
}

const SignUpWithEmail = ({
  email = "",
  setEmail,
  setUserExists,
}: {
  email?: string;
  setEmail: Dispatch<SetStateAction<string | undefined>>;
  setUserExists: Dispatch<SetStateAction<boolean | undefined>>;
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<Inputs>();

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    try {
      setIsLoading(true);
      setError("");

      const regResponse = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
        }),
      });

      if (!regResponse.ok) {
        const regData = await regResponse.json();
        throw new Error(regData.error || "Registration failed");
      }

      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      setIsLoading(false);
      router.push("/lists");
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || "An error occurred");
    }
  };

  return (
    <>
      <h2>Sign-up</h2>
      {isLoading ? (
        <div style={{ margin: "auto" }}>
          <Loading inline={true} />
        </div>
      ) : (
        <form className={styles.signInForm} onSubmit={handleSubmit(onSubmit)}>
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
            name="name"
            control={control}
            defaultValue={""}
            render={({ field }) => (
              <TextField
                {...field}
                id="name"
                label="Name"
                variant="outlined"
                fullWidth
                size="small"
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            )}
            rules={{
              required: "Please specify your name",
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
              pattern: {
                value: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,99}$/,
                message: "Password must be at least 8 characters and include uppercase, lowercase, and a number",
              },
            }}
          />
          <Controller
            name="passwordConfirm"
            control={control}
            defaultValue={""}
            render={({ field }) => (
              <TextField
                {...field}
                type="password"
                id="passwordConfirm"
                label="Confirm password"
                variant="outlined"
                fullWidth
                size="small"
                error={!!errors.passwordConfirm}
                helperText={errors.passwordConfirm?.message}
              />
            )}
            rules={{
              required: "Password confirmation is required",
              validate: (value, formValues) =>
                value === formValues.password || "Passwords do not match",
            }}
          />
          <button
            className={`primary ${styles.signInOptionButton}`}
            type="submit"
          >
            Sign-up
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

export default SignUpWithEmail;
