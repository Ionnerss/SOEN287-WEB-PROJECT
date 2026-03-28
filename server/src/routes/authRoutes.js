
//LOGIN SECTION OF AUTHENTICATION
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorBox = document.getElementById('errorBox');

    // Fake credentials
    const studentEmail = 'student@domain.com';
    const adminEmail = 'admin@domain.com';
    const correctPassword = '1234';


    //Same logic we will follow for the following 2 if statements. Have to figure out how to retrieve data now.
    // Student login
    if (email === studentEmail && password === correctPassword) {
      localStorage.setItem('userRole', 'student');
      window.location.href = '../student/dashboard.html';
      return;
    }

    // Admin login
    if (email === adminEmail && password === correctPassword) {
      localStorage.setItem('userRole', 'admin');
      window.location.href = '../admin/dashboard.html';
      return;
    }

    /*
    * Here we have to switch it up a bit to inform the user which is wrong.
    * If the email is wrong, we say invalid email adress 
    * if something wrong with password we say invalid credentials
    * !!! We could also setup a counter system, that way they have a limited amount of tries of login fails
    *   - Set up counter
    *   - Set up some sort of cooldown timer
    */
    // Invalid login
    errorBox.hidden = false;
    errorBox.textContent = 'Invalid email or password.';
  });
});


//SIGNUP SECTION OF AUTHENTICATION