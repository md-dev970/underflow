import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { InlineAlert } from "../../components/feedback/Feedback";
import { Button } from "../../components/forms/Button";
import { Input } from "../../components/forms/Fields";
import { authApi } from "../../lib/api/auth";

export const ForgotPasswordPage = (): JSX.Element => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await authApi.forgotPassword({ email });
      setIsSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to request a password reset link",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sectionSurface" style={{ maxWidth: 560, margin: "0 auto", padding: "2rem" }}>
      <form className="pageStack" onSubmit={handleSubmit}>
        <div>
          <h1>Forgot password</h1>
          <p className="mutedText">
            Enter your email and we will send a reset link if an account exists.
          </p>
        </div>
        {isSubmitted ? (
          <InlineAlert tone="success">
            If an account exists for that email, a password reset link has been sent.
          </InlineAlert>
        ) : null}
        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
        <Input
          disabled={isSubmitting || isSubmitted}
          label="Email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@company.com"
          required
          type="email"
          value={email}
        />
        <Button disabled={isSubmitting || isSubmitted} type="submit">
          {isSubmitting ? "Sending..." : "Send reset link"}
        </Button>
        <Link className="mutedText" to="/login">
          Back to login
        </Link>
      </form>
    </div>
  );
};
