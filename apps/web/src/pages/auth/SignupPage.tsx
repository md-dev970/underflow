import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { InlineAlert } from "../../components/feedback/Feedback";
import { Button } from "../../components/forms/Button";
import { Input, PasswordInput } from "../../components/forms/Fields";
import { useAuth } from "../../features/auth";
import { useToast } from "../../features/toast";
import { AuthPageFrame } from "./AuthPageFrame";

export const SignupPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register(form);
      showToast({ title: "Account created", tone: "success" });
      navigate("/app/overview", { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageFrame
      asideBody="Set up a workspace, connect AWS accounts with AssumeRole, and start building a trustworthy view of cloud spend."
      asideTitle="Built for engineering teams."
    >
      <form className="pageStack" onSubmit={handleSubmit} style={{ padding: "2rem" }}>
        <div>
          <h1 style={{ marginBottom: "0.5rem" }}>Create your account</h1>
          <p className="mutedText">
            Start with a clean workspace and connect AWS when you are ready.
          </p>
        </div>
        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
        <div className="twoColumn" style={{ gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Input
            label="First name"
            onChange={(event) =>
              setForm((current) => ({ ...current, firstName: event.target.value }))
            }
            required
            value={form.firstName}
          />
          <Input
            label="Last name"
            onChange={(event) =>
              setForm((current) => ({ ...current, lastName: event.target.value }))
            }
            required
            value={form.lastName}
          />
        </div>
        <Input
          label="Email"
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          required
          type="email"
          value={form.email}
        />
        <PasswordInput
          hint="Use at least 8 characters."
          label="Password"
          onChange={(event) =>
            setForm((current) => ({ ...current, password: event.target.value }))
          }
          required
          value={form.password}
        />
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
        <Link className="mutedText" to="/login">
          Already have an account? Log in
        </Link>
      </form>
    </AuthPageFrame>
  );
};
