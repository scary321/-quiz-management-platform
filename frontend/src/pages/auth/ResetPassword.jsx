import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { message } from "../../api/client";
import AuthShell from "../../components/AuthShell";
import { Alert } from "../../components/ui";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { token: params.get("token") || "" } });

  const onSubmit = async (values) => {
    setError("");
    try {
      await api.post("/auth/reset-password", values);
      navigate("/login", { replace: true });
    } catch (err) {
      setError(message(err));
    }
  };

  return (
    <AuthShell
      eyebrow="Password reset"
      title="Set a new password"
      footer={
        <Link to="/login" className="font-medium text-mark hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Alert>{error}</Alert>
        <div>
          <label className="label" htmlFor="token">
            Reset token
          </label>
          <input id="token" className="input font-mono text-xs" {...register("token", { required: "Paste the token." })} />
          {errors.token && <p className="mt-1 text-xs text-fail">{errors.token.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="password">
            New password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            {...register("password", {
              required: "Choose a password.",
              minLength: { value: 8, message: "Use at least 8 characters." },
            })}
          />
          {errors.password && <p className="mt-1 text-xs text-fail">{errors.password.message}</p>}
        </div>
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </AuthShell>
  );
}
