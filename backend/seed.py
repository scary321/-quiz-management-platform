"""Seed the database with demo data so every dashboard and chart has something to show.

Usage:  python seed.py            (adds data if the DB is empty)
        python seed.py --reset    (drops and recreates every table first)
"""
import random
import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import (
    Answer,
    Attempt,
    AttemptStatus,
    Category,
    Difficulty,
    Option,
    Question,
    Quiz,
    QuizStatus,
    Role,
    User,
    UserStatus,
)
from app.security import hash_password

random.seed(7)

CATEGORIES = [
    ("JavaScript", "Core language, DOM and async behaviour."),
    ("Python", "Syntax, data structures and the standard library."),
    ("React", "Components, hooks, state and routing."),
    ("Database", "SQL, normalisation and transactions."),
    ("Computer Networks", "Protocols, layers and addressing."),
    ("Cyber Security", "Web application security fundamentals."),
]

QUIZZES = [
    {
        "title": "JavaScript Fundamentals",
        "category": "JavaScript",
        "difficulty": Difficulty.INTERMEDIATE,
        "duration": 20,
        "passing_score": 60,
        "max_attempts": 2,
        "description": "Declarations, types, JSON handling and the event loop.",
        "questions": [
            ("Which method converts a JSON string into a JavaScript object?",
             ["JSON.stringify()", "JSON.parse()", "JSON.convert()", "JSON.object()"], 1,
             "JSON.parse() reads a JSON string and returns the equivalent JavaScript value."),
            ("Which keyword declares a binding that cannot be reassigned?",
             ["var", "let", "const", "static"], 2,
             "const prevents reassignment, though object contents can still change."),
            ("What does typeof null return?",
             ["'null'", "'object'", "'undefined'", "'boolean'"], 1,
             "A long-standing quirk: typeof null returns 'object'."),
            ("Which array method returns a new array without mutating the original?",
             ["push()", "splice()", "map()", "sort()"], 2,
             "map() builds and returns a new array; push, splice and sort mutate in place."),
            ("Which statement about '===' is correct?",
             ["It compares values after type coercion", "It compares value and type without coercion",
              "It only works on numbers", "It is identical to =="], 1,
             "Strict equality compares type and value with no coercion."),
            ("What is the output of typeof (() => {})?",
             ["'object'", "'function'", "'arrow'", "'undefined'"], 1,
             "Arrow functions are still functions, so typeof returns 'function'."),
        ],
    },
    {
        "title": "Python Basics",
        "category": "Python",
        "difficulty": Difficulty.BEGINNER,
        "duration": 15,
        "passing_score": 50,
        "max_attempts": 3,
        "description": "Data types, slicing, comprehensions and built-ins.",
        "questions": [
            ("Which built-in returns the number of items in a list?",
             ["size()", "count()", "len()", "length()"], 2, "len() returns the item count."),
            ("What does list[::-1] produce?",
             ["A sorted copy", "A reversed copy", "An empty list", "The last item"], 1,
             "A step of -1 walks the sequence backwards and returns a reversed copy."),
            ("Which data type is immutable?",
             ["list", "dict", "set", "tuple"], 3, "Tuples cannot be modified after creation."),
            ("What does a dict comprehension look like?",
             ["{k: v for k, v in pairs}", "[k: v for k, v in pairs]",
              "(k: v for k, v in pairs)", "dict[k, v for pairs]"], 0,
             "Curly braces with a key: value expression build a dict."),
            ("Which keyword creates a generator?",
             ["return", "yield", "async", "lambda"], 1,
             "yield suspends the function and turns it into a generator."),
        ],
    },
    {
        "title": "React Hooks in Practice",
        "category": "React",
        "difficulty": Difficulty.INTERMEDIATE,
        "duration": 25,
        "passing_score": 60,
        "max_attempts": 2,
        "description": "State, effects, memoisation and the rules of hooks.",
        "questions": [
            ("Which hook stores local component state?",
             ["useEffect", "useState", "useMemo", "useRef"], 1, "useState holds state across renders."),
            ("When does an effect with an empty dependency array run?",
             ["On every render", "Only after the first render", "Never", "Only on unmount"], 1,
             "An empty array means the effect runs once after mount."),
            ("Which hook keeps a mutable value without triggering re-renders?",
             ["useRef", "useState", "useReducer", "useContext"], 0,
             "useRef holds a mutable .current that does not cause re-renders."),
            ("Where can hooks be called?",
             ["Inside loops", "Inside conditions", "At the top level of a component or custom hook",
              "Anywhere"], 2, "Hooks must run in the same order on every render."),
            ("What does useMemo return?",
             ["A memoised callback", "A memoised computed value", "A ref object", "A context value"], 1,
             "useMemo caches a computed value; useCallback caches a function."),
        ],
    },
    {
        "title": "SQL & Relational Design",
        "category": "Database",
        "difficulty": Difficulty.ADVANCED,
        "duration": 30,
        "passing_score": 65,
        "max_attempts": 1,
        "description": "Joins, keys, indexes and transaction behaviour.",
        "questions": [
            ("Which join returns rows only when both sides match?",
             ["LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "FULL OUTER JOIN"], 2,
             "INNER JOIN keeps only matching pairs."),
            ("What does a foreign key enforce?",
             ["Uniqueness of a column", "Referential integrity between tables",
              "Automatic indexing", "Column ordering"], 1,
             "A foreign key guarantees the referenced row exists."),
            ("Which normal form removes partial dependency on a composite key?",
             ["1NF", "2NF", "3NF", "BCNF"], 1, "2NF removes partial dependencies."),
            ("What does the 'I' in ACID stand for?",
             ["Integrity", "Isolation", "Indexing", "Immutability"], 1,
             "Isolation keeps concurrent transactions from seeing each other's partial work."),
            ("Which clause filters rows after GROUP BY?",
             ["WHERE", "HAVING", "FILTER", "QUALIFY"], 1, "HAVING filters grouped results."),
        ],
    },
    {
        "title": "Networking Essentials",
        "category": "Computer Networks",
        "difficulty": Difficulty.BEGINNER,
        "duration": 15,
        "passing_score": 55,
        "max_attempts": 3,
        "description": "The OSI model, addressing and common protocols.",
        "questions": [
            ("Which layer of the OSI model does TCP operate at?",
             ["Network", "Transport", "Session", "Data link"], 1, "TCP is a transport layer protocol."),
            ("What does DNS resolve?",
             ["MAC to IP", "Domain names to IP addresses", "IP to port", "URL to HTML"], 1,
             "DNS maps human-readable names to IP addresses."),
            ("Which protocol is connectionless?",
             ["TCP", "UDP", "FTP", "SMTP"], 1, "UDP sends datagrams without a handshake."),
            ("What is the default port for HTTPS?",
             ["80", "443", "8080", "22"], 1, "HTTPS uses port 443."),
        ],
    },
    {
        "title": "Web Security Basics",
        "category": "Cyber Security",
        "difficulty": Difficulty.INTERMEDIATE,
        "duration": 20,
        "passing_score": 70,
        "max_attempts": 2,
        "description": "Injection, session handling and safe defaults.",
        "questions": [
            ("What prevents SQL injection most reliably?",
             ["Escaping quotes manually", "Parameterised queries", "Hiding error messages",
              "Client-side validation"], 1,
             "Parameterised queries separate code from data."),
            ("What does hashing a password with bcrypt provide?",
             ["Reversible encryption", "A slow, salted one-way digest", "Faster logins",
              "Shorter storage"], 1,
             "bcrypt is deliberately slow and salted, so hashes resist brute force."),
            ("Which attack injects scripts into pages viewed by other users?",
             ["CSRF", "XSS", "SSRF", "Clickjacking"], 1, "Cross-site scripting runs attacker JS in the victim's browser."),
            ("Why must scoring run on the server?",
             ["It is faster", "The client can be modified by the user",
              "The database requires it", "It reduces bandwidth"], 1,
             "Anything the browser computes can be tampered with, so marks must be graded server-side."),
            ("What does a JWT signature guarantee?",
             ["The payload is encrypted", "The payload has not been altered",
              "The user is an admin", "The token never expires"], 1,
             "A signature proves integrity, not confidentiality."),
        ],
    },
    {
        "title": "JavaScript Async Deep Dive",
        "category": "JavaScript",
        "difficulty": Difficulty.ADVANCED,
        "duration": 25,
        "passing_score": 65,
        "max_attempts": 2,
        "status": QuizStatus.PUBLISHED,
        "description": "Promises, microtasks and error handling in async code.",
        "questions": [
            ("Which runs first: a promise callback or a setTimeout(0) callback?",
             ["setTimeout", "The promise callback", "Whichever was written first", "They run together"], 1,
             "Microtasks drain before the next macrotask, so promises win."),
            ("What does Promise.allSettled return?",
             ["The first rejection", "Results for every promise regardless of outcome",
              "Only fulfilled values", "A single boolean"], 1,
             "allSettled waits for all promises and reports each status."),
            ("What does an async function always return?",
             ["The raw value", "A Promise", "undefined", "A generator"], 1,
             "async functions wrap their return value in a Promise."),
            ("How do you catch an error from an awaited call?",
             ["try/catch", "onerror", ".error()", "You cannot"], 0,
             "await throws, so try/catch handles rejections."),
        ],
    },
    {
        "title": "Python Data Structures (Draft)",
        "category": "Python",
        "difficulty": Difficulty.INTERMEDIATE,
        "duration": 20,
        "passing_score": 60,
        "max_attempts": 2,
        "status": QuizStatus.DRAFT,
        "description": "Work in progress: sets, deques, heaps and complexity.",
        "questions": [
            ("Average lookup complexity of a Python dict?",
             ["O(1)", "O(log n)", "O(n)", "O(n log n)"], 0, "Hash tables give amortised constant lookup."),
            ("Which structure gives O(1) appends at both ends?",
             ["list", "deque", "tuple", "set"], 1, "collections.deque is optimised for both ends."),
        ],
    },
]

STUDENTS = [
    "Rahul Verma", "Priya Nair", "Amit Sharma", "Sneha Iyer", "Karan Mehta",
    "Ananya Bose", "Vikram Rao", "Neha Gupta", "Arjun Menon", "Divya Pillai",
    "Rohit Chawla", "Meera Krishnan",
]


def reset_schema() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.scalar(select(User).where(User.role == Role.ADMIN)):
            print("Database already seeded. Use --reset to rebuild.")
            return

        now = datetime.now(timezone.utc)

        admin = User(
            name="Platform Admin",
            email=settings.admin_email.lower(),
            password=hash_password(settings.admin_password),
            role=Role.ADMIN,
            created_at=now - timedelta(days=60),
        )
        db.add(admin)

        students = []
        for index, name in enumerate(STUDENTS):
            handle = name.lower().split()[0]
            students.append(
                User(
                    name=name,
                    email=f"{handle}@student.dev",
                    password=hash_password("Student@123"),
                    role=Role.STUDENT,
                    status=UserStatus.INACTIVE if index == len(STUDENTS) - 1 else UserStatus.ACTIVE,
                    created_at=now - timedelta(days=random.randint(2, 45)),
                )
            )
        db.add_all(students)

        categories = {}
        for name, description in CATEGORIES:
            cat = Category(name=name, description=description, created_at=now - timedelta(days=50))
            db.add(cat)
            categories[name] = cat
        db.flush()

        quizzes = []
        for spec in QUIZZES:
            quiz = Quiz(
                title=spec["title"],
                description=spec["description"],
                category_id=categories[spec["category"]].id,
                difficulty=spec["difficulty"],
                duration=spec["duration"],
                passing_score=spec["passing_score"],
                max_attempts=spec["max_attempts"],
                status=spec.get("status", QuizStatus.PUBLISHED),
                randomize_questions=spec["title"].startswith("JavaScript Async"),
                randomize_options=spec["title"].startswith("Web Security"),
                created_at=now - timedelta(days=random.randint(5, 40)),
            )
            for text, options, correct_index, explanation in spec["questions"]:
                quiz.questions.append(
                    Question(
                        question_text=text,
                        marks=1.0,
                        explanation=explanation,
                        difficulty=spec["difficulty"],
                        options=[
                            Option(option_text=opt, is_correct=(i == correct_index))
                            for i, opt in enumerate(options)
                        ],
                    )
                )
            db.add(quiz)
            quizzes.append(quiz)
        db.flush()

        published = [q for q in quizzes if q.status is QuizStatus.PUBLISHED]
        active_students = [s for s in students if s.status is UserStatus.ACTIVE]

        for student in active_students:
            skill = random.uniform(0.45, 0.95)
            for quiz in random.sample(published, k=random.randint(2, min(5, len(published)))):
                started = now - timedelta(days=random.randint(0, 28), hours=random.randint(0, 20))
                questions = quiz.questions
                attempt = Attempt(
                    quiz_id=quiz.id,
                    user_id=student.id,
                    started_at=started,
                    expires_at=started + timedelta(minutes=quiz.duration),
                    question_order=",".join(str(q.id) for q in questions),
                )
                db.add(attempt)
                db.flush()

                correct = incorrect = unanswered = 0
                score = 0.0
                for question in questions:
                    roll = random.random()
                    if roll > 0.94:
                        unanswered += 1
                        db.add(Answer(attempt_id=attempt.id, question_id=question.id, selected_option_id=None))
                        continue
                    right = random.random() < skill
                    chosen = next(o for o in question.options if o.is_correct) if right else random.choice(
                        [o for o in question.options if not o.is_correct]
                    )
                    db.add(
                        Answer(
                            attempt_id=attempt.id,
                            question_id=question.id,
                            selected_option_id=chosen.id,
                            is_correct=right,
                        )
                    )
                    if right:
                        correct += 1
                        score += question.marks
                    else:
                        incorrect += 1

                total_marks = sum(q.marks for q in questions)
                percentage = round(score / total_marks * 100, 2)
                attempt.score = score
                attempt.total_marks = total_marks
                attempt.percentage = percentage
                attempt.correct_answers = correct
                attempt.incorrect_answers = incorrect
                attempt.unanswered = unanswered
                attempt.time_taken = random.randint(int(quiz.duration * 25), quiz.duration * 60 - 30)
                attempt.completed_at = started + timedelta(seconds=attempt.time_taken)
                attempt.status = (
                    AttemptStatus.PASSED if percentage >= quiz.passing_score else AttemptStatus.FAILED
                )

        db.commit()
        print("Seeded.")
        print(f"  Admin    {settings.admin_email} / {settings.admin_password}")
        print("  Student  rahul@student.dev / Student@123  (any first name works)")
    finally:
        db.close()


if __name__ == "__main__":
    if "--reset" in sys.argv:
        reset_schema()
        print("Schema reset.")
    seed()
