const VERDICTS = {
    ACCEPTED: 'Accepted',
    WRONG_ANSWER: 'Wrong Answer',
    TLE: 'TLE',
    RUNTIME_ERROR: 'Runtime Error',
    COMPILATION_ERROR: 'Compilation Error',
    PENDING: 'Pending',
    STARTED: 'STARTED',
    VIOLATION: 'VIOLATION_LOG',
    COMPLETED: 'COMPLETED'
};

const CONTENT_TYPES = {
    PROBLEM: 'problem',
    SQL: 'sql',
    VIDEO: 'video',
    QUIZ: 'quiz',
    ARTICLE: 'article',
    PRACTICAL: 'practical',
    ASSIGNMENT: 'assignment'
};

const USER_ROLES = {
    STUDENT: 'student',
    INSTRUCTOR: 'instructor',
    ADMIN: 'admin'
};

const DB_TYPES = {
    MYSQL: 'mysql',
    POSTGRES: 'postgres',
    POSTGRESQL: 'postgresql'
};

module.exports = {
    VERDICTS,
    CONTENT_TYPES,
    USER_ROLES,
    DB_TYPES
};
