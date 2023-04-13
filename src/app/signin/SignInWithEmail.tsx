"use client";

import { TextField } from "@mui/material";
import { useState } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import EmailSignUpForm from "./SignUpWithEmail";

interface Inputs {
  email: string;
}

const SignInWithEmail = () => {
  const [userExists, setUserExists] = useState<boolean>();
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<Inputs>();

  const onSubmit = (data: Inputs) => {
    // check if user exists, if not show sign up form, otherweise log in form

    console.log("email: ", data.email);
  };

  return (
    <>
      <h2>Sign in with email</h2>
      {userExists === true && <div>Sign in form</div>}
      {userExists === false && <EmailSignUpForm />}
      {userExists === undefined && (
        <form onSubmit={handleSubmit(onSubmit)}>
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
          <button type="submit">next</button>
        </form>
      )}
    </>
  );
};

export default SignInWithEmail;
