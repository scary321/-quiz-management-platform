import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

import StudentDashboard from "./pages/student/Dashboard";
import BrowseQuizzes from "./pages/student/BrowseQuizzes";
import QuizDetail from "./pages/student/QuizDetail";
import AttemptQuiz from "./pages/student/AttemptQuiz";
import Result from "./pages/student/Result";
import History from "./pages/student/History";
import Leaderboard from "./pages/student/Leaderboard";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminQuizzes from "./pages/admin/Quizzes";
import QuizForm from "./pages/admin/QuizForm";
import Questions from "./pages/admin/Questions";
import Categories from "./pages/admin/Categories";
import Students from "./pages/admin/Students";
import StudentProfile from "./pages/admin/StudentProfile";
import AdminAttempts from "./pages/admin/Attempts";
import Analytics from "./pages/admin/Analytics";

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "ADMIN" ? "/admin" : "/dashboard"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* The attempt screen runs full width with no navigation, by design. */}
      <Route
        path="/quizzes/:quizId/attempt"
        element={
          <ProtectedRoute role="STUDENT">
            <AttemptQuiz />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/attempts/:attemptId" element={<Result />} />

        <Route path="/dashboard" element={<ProtectedRoute role="STUDENT"><StudentDashboard /></ProtectedRoute>} />
        <Route path="/quizzes" element={<ProtectedRoute role="STUDENT"><BrowseQuizzes /></ProtectedRoute>} />
        <Route path="/quizzes/:quizId" element={<ProtectedRoute role="STUDENT"><QuizDetail /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute role="STUDENT"><History /></ProtectedRoute>} />

        <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/quizzes" element={<ProtectedRoute role="ADMIN"><AdminQuizzes /></ProtectedRoute>} />
        <Route path="/admin/quizzes/new" element={<ProtectedRoute role="ADMIN"><QuizForm /></ProtectedRoute>} />
        <Route path="/admin/quizzes/:quizId/edit" element={<ProtectedRoute role="ADMIN"><QuizForm /></ProtectedRoute>} />
        <Route path="/admin/quizzes/:quizId/questions" element={<ProtectedRoute role="ADMIN"><Questions /></ProtectedRoute>} />
        <Route path="/admin/categories" element={<ProtectedRoute role="ADMIN"><Categories /></ProtectedRoute>} />
        <Route path="/admin/students" element={<ProtectedRoute role="ADMIN"><Students /></ProtectedRoute>} />
        <Route path="/admin/students/:userId" element={<ProtectedRoute role="ADMIN"><StudentProfile /></ProtectedRoute>} />
        <Route path="/admin/attempts" element={<ProtectedRoute role="ADMIN"><AdminAttempts /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute role="ADMIN"><Analytics /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Home />} />
    </Routes>
  );
}
