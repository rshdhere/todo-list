import { z } from "@/src/index.js";

export const authSchema = {
  input: z
    .object({
      email: z.email({ message: "invalid email for sign-up procedure" }),
      password: z
        .string()
        .min(8, { message: "password should be minimum of 8 charachters" })
        .max(24, { message: "password should be maximum of 24 charachters" })
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/,
          {
            message:
              "password must contain at least one upper-case letter, one lower-case letter, a number, and a special-character",
          },
        ),
    })
    .strict(),

  output: z
    .object({
      userId: z.uuid(),
    })
    .strict(),

  signinOutput: z
    .object({
      token: z.string().min(1),
    })
    .strict(),
};

export const userSchema = {
  meOutput: z
    .object({
      usdBalance: z.number(),
    })
    .strict(),
};
