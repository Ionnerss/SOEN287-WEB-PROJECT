## SOEN 287 PROJECT OUTLINE

The Web project is divided into 2 components: Client & Server.

- Client -> UI/UX, CSS Design, Frontend JS
- Server -> Backend JS, SQL database

Client side is divided into three components:

- mainSide: Main home page of the website + login and sign-up pages
- studentSide: Option for students to go in record their classes, grades, etc.
- adminSide: Option for teachers/admins (really unclear in the assignment details but we'll figure it out), modify classes, record data, etc.

Server side will completed later on. For now, testing will be done with hardcoded data to avoid working with backend JS and SQL.

When you start working on the project or make changes, please open a new branch derived from dev.
Let's agree to follow the following naming convention in order to avoid confusion as to what work has been done or what has been worked on: typeOfWork/specificXYZ ; typeOfWork ex: feature, fix, debug, etc.
examples: feature/button-layout | fix/paragraph-bug

For work to be pushed forward from the dev branch, 2/3 votes will be required in order to push.
This allows for work to be properly tested and evaluated as to avoid bugs being pushed onto main.

Please install the following extensions as they are necessary for working with these languages:

- Live Server -> Really helpful, allows you to check changes made in real time locally so that you don't have to go back later on in hundreds of lines of code just to fix something simple.
- Prettier -> This is more for overall readability, it will basically format all code to be unformed and organized that way our work can be comprehensible and good regardless of writing styles.

!!!There's a specific cmd line to run after writing code (for prettier): npm.cmd run format
(There's better ways of doing this so I'll try figuring a better method out, my apologies :/)
