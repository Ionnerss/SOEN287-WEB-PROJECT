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


CREATE TABLE IF NOT EXISTS auth_sessions (
  session_id CHAR(64) PRIMARY KEY,
  user_id INT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_auth_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth_challenges (
  challenge_id CHAR(64) PRIMARY KEY,
  user_id INT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_auth_challenges_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
