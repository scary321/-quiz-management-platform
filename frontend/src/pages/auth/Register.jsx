import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { message } from "../../api/client";
import AuthShell from "../../components/AuthShell";
import { Alert } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

export default function Register() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    setError("");
    try {
      await signUp(values);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(message(err, "Could not create the account."));
    }
  };

  return (
    <AuthShell
      eyebrow="Create account"
      title="Start attempting quizzes"
      subtitle="Student accounts are self-serve. Admin accounts are issued by the platform owner."
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-medium text-mark hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Alert>{error}</Alert>
        <div>
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            className="input"
            {...register("name", { required: "Enter your name.", minLength: { value: 2, message: "Too short." } })}
          />
          {errors.name && <p className="mt-1 text-xs text-fail">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input"
            {...register("email", {
              required: "Enter your email.",
              pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email." },
            })}
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
            {...register("password", {
              required: "Choose a password.",
              minLength: { value: 8, message: "Use at least 8 characters." },
            })}
          />
          {errors.password && <p className="mt-1 text-xs text-fail">{errors.password.message}</p>}
        </div>
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
