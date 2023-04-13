"use client";

import { TextField } from "@mui/material";
import { useAuth } from "app/authContext";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";

interface Inputs {
  email: string;
  name: string;
  password: string;
  passwordConfirm: string;
}

// TODO in first step only ask for email, then check if user exists
// TODO if user exists, then log in instead of creating a new user
// TODO if user does not exist, then create first list right away on the server,
// then redirect to that list

const SignUpWithEmail = ({ email = "" }: { email?: string }) => {
  const { auth } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<Inputs>();

  const onSubmit: SubmitHandler<Inputs> = (data) => {
    console.log("email: ", data.email);
    console.log("password: ", data.password);
    console.log("passwordConfirm: ", data.passwordConfirm);

    createUserWithEmailAndPassword(auth, data.email, data.password)
      .then((userCredential) => {
        // Signed in
        router.push("/lists");
      })
      .catch((err) => {
        const errorCode = err.code;
        const errorMessage = err.message;

        setError(errorCode);
        // ..
        console.log("error code: ", errorCode);
        console.log("error message: ", errorMessage);
      });
  };

  return (
    <>
      <div>Hello from new Login</div>
      <div>Sign-up</div>
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
          name="name"
          control={control}
          defaultValue={""}
          render={({ field }) => (
            <TextField
              {...field}
              id="name"
              label="Name"
              variant="outlined"
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
              error={!!errors.password}
              helperText={errors.password?.message}
            />
          )}
          rules={{
            required: "Password is required",
            pattern: {
              value: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,99}$/,
              message: "Invalid password",
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
        <button type="submit">Sign-up</button>
      </form>
      {error && <div>Error: {error}</div>}
    </>
  );
};

export default SignUpWithEmail;
