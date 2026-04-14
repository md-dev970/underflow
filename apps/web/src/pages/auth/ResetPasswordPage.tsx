import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { InlineAlert } from "../../components/feedback/Feedback";
import { Button } from "../../components/forms/Button";
import { PasswordInput } from "../../components/forms/Fields";
import { authApi } from "../../lib/api/auth";

export const ResetPasswordPage = (): JSX.Element => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("This password reset link is invalid or incomplete.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await authApi.resetPassword({ token, password });
      navigate("/login", {
        replace: true,
        state: {
          resetSuccess: true,
        },
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to reset your password",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div
        className="sectionSurface"
        style={{ maxWidth: 560, margin: "0 auto", padding: "2rem" }}
      >
        <div className="pageStack">
          <div>
            <h1>Reset password</h1>
            <p className="mutedText">
              This password reset link is missing a token or has been opened incorrectly.
            </p>
          </div>
          <InlineAlert tone="warning">
            Request a new reset link and try again.
          </InlineAlert>
          <Link className="mutedText" to="/forgot-password">
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="sectionSurface" style={{ maxWidth: 560, margin: "0 auto", padding: "2rem" }}>
      <form className="pageStack" onSubmit={handleSubmit}>
        <div>
          <h1>Reset password</h1>
          <p className="mutedText">
            Choose a new password for your Underflow account.
          </p>
        </div>
        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
        <PasswordInput
          hint="Use at least 8 characters."
          label="New password"
          onChange={(event) => setPassword(event.target.value)}
          required
          value={password}
        />
        <PasswordInput
          label="Confirm password"
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          value={confirmPassword}
        />
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Updating..." : "Update password"}
        </Button>
        <Link className="mutedText" to="/login">
          Back to login
        </Link>
      </form>
    </div>
  );
};
