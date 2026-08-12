from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import AttemptStatus, Difficulty, QuizStatus, Role, UserStatus


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- auth ----------
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=128)


class UserOut(ORM):
    id: int
    name: str
    email: EmailStr
    role: Role
    status: UserStatus
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class StudentRow(UserOut):
    quizzes_attempted: int = 0
    average_score: float = 0.0
    highest_score: float = 0.0


# ---------- categories ----------
class CategoryIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None


class CategoryOut(ORM):
    id: int
    name: str
    description: str | None
    quiz_count: int = 0


# ---------- quizzes ----------
class QuizIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = None
    category_id: int | None = None
    difficulty: Difficulty = Difficulty.BEGINNER
    duration: int = Field(default=20, ge=1, le=600)
    passing_score: int = Field(default=60, ge=0, le=100)
    max_attempts: int = Field(default=1, ge=1, le=50)
    status: QuizStatus = QuizStatus.DRAFT
    thumbnail: str | None = None
    negative_marks: float = Field(default=0.0, ge=0, le=10)
    randomize_questions: bool = False
    randomize_options: bool = False


class QuizOut(ORM):
    id: int
    title: str
    description: str | None
    category_id: int | None
    category_name: str | None = None
    difficulty: Difficulty
    duration: int
    passing_score: int
    max_attempts: int
    status: QuizStatus
    thumbnail: str | None
    negative_marks: float
    randomize_questions: bool
    randomize_options: bool
    question_count: int = 0
    attempt_count: int = 0
    created_at: datetime


class QuizDetailOut(QuizOut):
    attempts_used: int = 0
    attempts_left: int = 0
    best_percentage: float | None = None


# ---------- questions ----------
class OptionIn(BaseModel):
    option_text: str = Field(min_length=1)
    is_correct: bool = False


class QuestionIn(BaseModel):
    question_text: str = Field(min_length=3)
    marks: float = Field(default=1.0, gt=0, le=100)
    explanation: str | None = None
    difficulty: Difficulty = Difficulty.BEGINNER
    options: list[OptionIn] = Field(min_length=2, max_length=8)


class OptionOut(ORM):
    id: int
    option_text: str
    is_correct: bool


class QuestionOut(ORM):
    id: int
    quiz_id: int
    question_text: str
    marks: float
    explanation: str | None
    difficulty: Difficulty
    options: list[OptionOut]


# ---------- attempts ----------
class AttemptOptionOut(BaseModel):
    id: int
    option_text: str


class AttemptQuestionOut(BaseModel):
    id: int
    question_text: str
    marks: float
    options: list[AttemptOptionOut]
    selected_option_id: int | None = None


class AttemptSessionOut(BaseModel):
    attempt_id: int
    quiz_id: int
    quiz_title: str
    duration: int
    negative_marks: float
    server_time: datetime
    expires_at: datetime
    seconds_remaining: int
    questions: list[AttemptQuestionOut]


class AnswerIn(BaseModel):
    question_id: int
    selected_option_id: int | None = None


class AttemptSummaryOut(ORM):
    id: int
    quiz_id: int
    quiz_title: str | None = None
    user_id: int
    student_name: str | None = None
    score: float
    total_marks: float
    percentage: float
    correct_answers: int
    incorrect_answers: int
    unanswered: int
    time_taken: int
    status: AttemptStatus
    started_at: datetime
    completed_at: datetime | None


class ReviewItemOut(BaseModel):
    question_id: int
    question_text: str
    marks: float
    explanation: str | None
    selected_option_id: int | None
    correct_option_id: int
    is_correct: bool
    options: list[OptionOut]


class AttemptResultOut(BaseModel):
    attempt: AttemptSummaryOut
    passing_score: int
    review: list[ReviewItemOut]


# ---------- dashboards / analytics ----------
class Point(BaseModel):
    label: str
    value: float


class AdminStatsOut(BaseModel):
    total_students: int
    total_quizzes: int
    published_quizzes: int
    draft_quizzes: int
    total_questions: int
    total_attempts: int
    average_score: float
    passed_attempts: int
    failed_attempts: int


class AdminAnalyticsOut(BaseModel):
    attempts_over_time: list[Point]
    registrations_over_time: list[Point]
    average_scores_by_quiz: list[Point]
    pass_fail: list[Point]
    popular_quizzes: list[Point]
    popular_categories: list[Point]


class StudentStatsOut(BaseModel):
    attempted: int
    passed: int
    failed: int
    average_score: float
    highest_score: float
    questions_answered: int
    score_trend: list[Point]
    recent: list[AttemptSummaryOut]


class LeaderboardRow(BaseModel):
    rank: int
    user_id: int
    student: str
    average_score: float
    highest_score: float
    quizzes_completed: int
