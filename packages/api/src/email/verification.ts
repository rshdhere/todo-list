import jwt from "jsonwebtoken";
import { Resend } from "resend";
import { TRPCError } from "@trpc/server";
import {
  FROM_ADDRESS,
  JWT_SECRET,
  RESEND_API_KEY,
  SERVER_URL,
} from "@todo-list/config";

const EMAIL_VERIFICATION_TOKEN_INTENT = "verify-email";

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

export async function sendVerificationEmail(userId: string, email: string) {
  if (!RESEND_API_KEY || !FROM_ADDRESS || !SERVER_URL) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "email verification configuration is missing",
    });
  }

  const verificationToken = createEmailVerificationToken(userId);
  const verificationUrl = createVerificationUrl(verificationToken);
  const resend = new Resend(RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: "Verify your email address",
    html: `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background-color: #f9fafb;">
            <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #111827;">
                Verify your email
              </h1>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #4b5563;">
                Thanks for signing up at <b>rshdhere technologies</b>! Please click the button below to verify your email address.
              </p>
              <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #111827; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
                Verify Email
              </a>
              <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #6b7280;">
                If you didn't create an account, you can safely ignore this email.
              </p>
              <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af;">
                This link will expire in 24 hours.
              </p>
            </div>
          </body>
        </html>`,
  });

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "failed to send verification email",
    });
  }
}
