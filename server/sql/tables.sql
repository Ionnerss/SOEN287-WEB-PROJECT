-- 1. Users Table
-- Stores credentials and role-based access levels
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  twofa_secret VARCHAR(255) DEFAULT NULL,
  twofa_enabled TINYINT(1) NOT NULL DEFAULT 0,
  twofa_last_timestep BIGINT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Courses Table
-- Linked to the admin user who created it
CREATE TABLE IF NOT EXISTS courses (
    course_id   INT PRIMARY KEY AUTO_INCREMENT,
    user_id     INT NOT NULL,
    code        VARCHAR(50) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    instructor  VARCHAR(255),
    term        VARCHAR(100),
    enabled     TINYINT(1) NOT NULL DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    enabled     TINYINT(1) NOT NULL DEFAULT 1
);

-- 3. Assessments Table
-- Contains grading criteria and weights for each course
CREATE TABLE IF NOT EXISTS assessments (
    assessment_id  INT PRIMARY KEY AUTO_INCREMENT,
    course_id      INT NOT NULL,
    title          VARCHAR(255) NOT NULL,
    category       VARCHAR(50) NOT NULL, -- Corresponds to 'type' in JS
    due_date       DATE,
    weight         DECIMAL(5,2) DEFAULT 0.00,
    earned_marks   INT DEFAULT 0,
    total_marks    INT NOT NULL,
    completed      BOOLEAN DEFAULT FALSE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assessments_course 
        FOREIGN KEY (course_id) REFERENCES courses(course_id) 
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Auth Sessions Table
-- Manages active user logins
CREATE TABLE IF NOT EXISTS auth_sessions (
    session_id CHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auth_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(user_id) 
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Auth Challenges Table
-- Used for 2FA/Login verification flows
CREATE TABLE IF NOT EXISTS auth_challenges (
    challenge_id CHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auth_challenges_user
        FOREIGN KEY (user_id) REFERENCES users(user_id) 
        ON DELETE CASCADE
) ENGINE=InnoDB;