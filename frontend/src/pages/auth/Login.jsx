import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { message } from "../../api/client";
import AuthShell from "../../components/AuthShell";
import { Alert } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    setError("");
    try {
      const user = await login(values);
      navigate(user.role === "ADMIN" ? "/admin" : "/dashboard", { replace: true });
    } catch (err) {
      setError(message(err, "Email or password is incorrect."));
    }
  };

  const fillDemo = (role) => {
    setValue("email", role === "admin" ? "admin@quizplatform.dev" : "rahul@student.dev");
    setValue("password", role === "admin" ? "Admin@123" : "Student@123");
  };

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back"
      subtitle="Use the account your institution issued you."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="font-medium text-mark hover:underline">
            Create a student account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Alert>{error}</Alert>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input"
            placeholder="you@college.edu"
            {...register("email", { required: "Enter your email." })}
          />
          {errors.email && <p className="mt-1 text-xs text-fail">{errors.email.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="••••••••"
            {...register("password", { required: "Enter your password." })}
          />
          {errors.password && <p className="mt-1 text-xs text-fail">{errors.password.message}</p>}
        </div>
        <div className="flex items-center justify-between">
          <Link to="/forgot-password" className="text-sm text-ink-soft hover:text-ink">
            Forgot password?
          </Link>
        </div>
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-6 rounded-[8px] border border-dashed border-rule p-3">
        <p className="eyebrow">Demo accounts</p>
        <div className="mt-2 flex gap-2">
          <button type="button" className="btn-ghost btn-sm" onClick={() => fillDemo("admin")}>
            Admin
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => fillDemo("student")}>
            Student
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
