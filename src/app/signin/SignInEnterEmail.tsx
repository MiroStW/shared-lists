"use client";

import { TextField } from "@mui/material";
import { useAuth } from "app/authContext";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import SignInWithEmail from "./SignInWithEmail";
import SignUpWithEmail from "./SignUpWithEmail";

interface Inputs {
  email: string;
}

const SignInEnterEmail = ({
  setSignInOption,
}: {
  setSignInOption: Dispatch<SetStateAction<"email" | "google" | undefined>>;
}) => {
  const { auth } = useAuth();
  const [userExists, setUserExists] = useState<boolean>();
  const [email, setEmail] = useState<string>();

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<Inputs>();

  const onSubmit = async (data: Inputs) => {
    // check if user exists, if not show sign up form, otherweise log in form
    setSignInOption("email");
    setEmail(data.email);
    const existingSignIns = await fetchSignInMethodsForEmail(auth, data.email);
    if (existingSignIns.includes("password")) {
      console.log("user exists with email");
      setUserExists(true);
    } else {
      setUserExists(false);
    }

    console.log("email: ", data.email);
  };

  return (
    <>
      <h2>Sign in with email</h2>
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
      {userExists === false && (
        <SignUpWithEmail email={email} setUserExists={setUserExists} />
      )}
      {userExists === true && (
        <SignInWithEmail email={email} setUserExists={setUserExists} />
      )}
    </>
  );
};

export default SignInEnterEmail;
