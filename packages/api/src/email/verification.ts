import jwt from "jsonwebtoken";
import { Resend } from "resend";
import { TRPCError } from "@trpc/server";
import { readFile } from "node:fs/promises";
import {
  FROM_ADDRESS,
  JWT_SECRET,
  RESEND_API_KEY,
  SERVER_URL,
} from "@todo-list/config";

const EMAIL_VERIFICATION_TOKEN_INTENT = "verify-email";

const VERIFICATION_URL_PLACEHOLDER = "{{VERIFICATION_URL}}";
const verificationEmailTemplatePromise = readFile(
  new URL("./email.html", import.meta.url),
  "utf8",
);

type EmailVerificationTokenPayload = {
  userId: string;
  intent: typeof EMAIL_VERIFICATION_TOKEN_INTENT;
};

export function isEmailVerificationTokenPayload(
  value: unknown,
): value is EmailVerificationTokenPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<EmailVerificationTokenPayload>;
  return (
    typeof payload.userId === "string" &&
    payload.intent === EMAIL_VERIFICATION_TOKEN_INTENT
  );
}

function createEmailVerificationToken(userId: string) {
  if (!JWT_SECRET) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "JWT secret's are not baked in the server",
    });
  }

  return jwt.sign(
    {
      userId,
      intent: EMAIL_VERIFICATION_TOKEN_INTENT,
    },
    JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "1d",
    },
  );
}

function createVerificationUrl(token: string) {
  if (!SERVER_URL) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "email verification configuration is missing",
    });
  }

  try {
    const verificationUrl = new URL("/verify-email", SERVER_URL);
    verificationUrl.searchParams.set("token", token);
    return verificationUrl.toString();
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "SERVER_URL must be a valid absolute URL",
    });
  }
}

async function renderVerificationEmailTemplate(verificationUrl: string) {
  let template: string;

  try {
    template = await verificationEmailTemplatePromise;
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "email verification template is missing",
    });
  }

  if (!template.includes(VERIFICATION_URL_PLACEHOLDER)) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "email verification template is invalid",
    });
  }

  return template.replaceAll(VERIFICATION_URL_PLACEHOLDER, verificationUrl);
}

export async function sendVerificationEmail(userId: string, email: string) {
  if (!RESEND_API_KEY || !FROM_ADDRESS || !SERVER_URL) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "email verification configuration is missing",
    });
  }

  const verificationToken = createEmailVerificationToken(userId);
  const verificationUrl = createVerificationUrl(verificationToken);
  const html = await renderVerificationEmailTemplate(verificationUrl);
  const resend = new Resend(RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: "Verify your email address",
    html,
  });

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "failed to send verification email",
    });
  }
}
