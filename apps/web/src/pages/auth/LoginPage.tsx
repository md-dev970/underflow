import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { InlineAlert } from "../../components/feedback/Feedback";
import { Button } from "../../components/forms/Button";
import { Input, PasswordInput } from "../../components/forms/Fields";
import { useAuth } from "../../features/auth";
import { useToast } from "../../features/toast";
import { AuthPageFrame } from "./AuthPageFrame";

export const LoginPage = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resetSuccess = Boolean(
    (location.state as { resetSuccess?: boolean } | null)?.resetSuccess,
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(form);
      showToast({ title: "Welcome back", tone: "success" });
      const nextPath = (location.state as { from?: { pathname?: string } } | null)?.from
        ?.pathname;
      navigate(nextPath ?? "/app/overview", { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to log in");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageFrame
      asideBody="Underflow gives product and infrastructure teams a shared picture of what AWS costs are doing right now."
      asideTitle="Bring finance clarity to every engineering decision."
    >
      <form className="pageStack" onSubmit={handleSubmit} style={{ padding: "2rem" }}>
        <div>
          <h1 style={{ marginBottom: "0.5rem" }}>Welcome back</h1>
          <p className="mutedText">Sign in to continue monitoring your AWS spend.</p>
        </div>
        {resetSuccess ? (
          <InlineAlert tone="success">
            Password updated. Sign in with your new password.
          </InlineAlert>
        ) : null}
        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
        <Input
          label="Email"
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          placeholder="engineering@company.com"
          required
          type="email"
          value={form.email}
        />
        <PasswordInput
          label="Password"
          onChange={(event) =>
            setForm((current) => ({ ...current, password: event.target.value }))
          }
          required
          value={form.password}
        />
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
          <Link className="mutedText" to="/forgot-password">
            Forgot password?
          </Link>
          <Link className="mutedText" to="/signup">
            Create an account
          </Link>
        </div>
      </form>
    </AuthPageFrame>
  );
};
