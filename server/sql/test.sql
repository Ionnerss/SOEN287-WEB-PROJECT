
USE test;

INSERT INTO users (
    full_name, 
    email, 
    password_hash, 
    role, 
    twofa_enabled
) VALUES (
    'Temp Admin', 
    'admin.test@local.dev', 
    '$2b$12$BrP8p/0INleiZtWPJWLNYuerfYFspxmEngRmfDmBD7Gdk.MyjlVZ2', 
    'admin', 
    0
);