CREATE TABLE users (
    user_id        INT PRIMARY KEY AUTO_INCREMENT,
    email          VARCHAR(255) UNIQUE NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    role           ENUM('student', 'admin') NOT NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
    course_id   INT PRIMARY KEY AUTO_INCREMENT,
    user_id     INT NOT NULL REFERENCES users(user_id),
    code        VARCHAR(50) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    instructor  VARCHAR(255),
    term        VARCHAR(100),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assessments (
    assessment_id  INT PRIMARY KEY AUTO_INCREMENT,
    course_id      INT NOT NULL REFERENCES courses(course_id),
    title          VARCHAR(255) NOT NULL,
    category       VARCHAR(50) NOT NULL,
    due_date       DATE,
    earned_marks   INT DEFAULT 0,
    total_marks    INT NOT NULL,
    completed      BOOLEAN DEFAULT FALSE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);