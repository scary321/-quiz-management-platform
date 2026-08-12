import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import api, { message } from "../../api/client";
import AuthShell from "../../components/AuthShell";
import { Alert } from "../../components/ui";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [sent, setSent] = useState(null);
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();

  const onSubmit = async (values) => {
    setError("");
    try {
      const { data } = await api.post("/auth/forgot-password", values);
      setSent(data);
    } catch (err) {
      setError(message(err));
    }
  };

  return (
    <AuthShell
      eyebrow="Password reset"
      title="Request a reset link"
      subtitle="Enter the email on your account and we will issue a single-use reset token."
      footer={
        <Link to="/login" className="font-medium text-mark hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <Alert tone="pass">{sent.message}</Alert>
          {sent.reset_token && (
            <div className="rounded-[8px] border border-dashed border-rule p-3">
              <p className="eyebrow">Development token</p>
              <p className="mt-1.5 break-all font-mono text-xs text-ink-soft">{sent.reset_token}</p>
              <button
                className="btn-primary btn-sm mt-3"
                onClick={() => navigate(`/reset-password?token=${sent.reset_token}`)}
              >
                Continue to reset
              </button>
              <p className="mt-2 text-xs text-ink-faint">
                No mail server is wired up in this build, so the token is shown here instead of emailed.
              </p>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Alert>{error}</Alert>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" className="input" {...register("email", { required: true })} />
          </div>
          <button className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
