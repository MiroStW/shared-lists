"use client";

import { TextField } from "@mui/material";
import { useAuth } from "app/authContext";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";

interface Inputs {
  email: string;
  password: string;
}

const SignInWithEmail = ({
  email = "",
  setUserExists,
}: {
  email?: string;
  setUserExists: Dispatch<SetStateAction<boolean | undefined>>;
}) => {
  const [error, setError] = useState<string>("");
  const { auth } = useAuth();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<Inputs>();

  const onSubmit = async (data: Inputs) => {
    // check if user exists, if not show sign up form, otherweise log in form
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      router.push("/lists");
    } catch (err) {
      if (typeof err === "string") {
        console.log("error", err);
        setError(err);
      } else if (err instanceof FirebaseError) {
        console.log("error", err.code);
        console.log("error message: ", err.message);
        setError(err.code);
      }
    }
    console.log("email: ", data.email);
  };
  return (
    <>
      <h2>Welcome back!</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
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
              error={!!errors.password}
              helperText={errors.password?.message}
            />
          )}
          rules={{
            required: "Password is required",
          }}
        />
        <button onClick={() => setUserExists(undefined)}>back</button>
        <button type="submit">next</button>
      </form>
      {error && <div>Error: {error}</div>}
    </>
  );
};

export default SignInWithEmail;
