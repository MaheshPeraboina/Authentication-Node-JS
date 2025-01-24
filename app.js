const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "userData.db");

let database = null;

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//API-1: Register

//Scenario-1: If the username already exists - User already exists
//Scenario-2: If the registrant provides a password with less than 5 characters - Password is too short
//Scenario-3: Successful registration of the registrant - User created successfully

app.post("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const checkUserQuery = `
  SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await database.get(checkUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO user(username, name, password, gender, location)
      VALUES ('${username}', '${name}', '${hashedPassword}', '${gender}', '${location}' )`;

    if (password.length > 5) {
      await database.run(createUserQuery);
      response.send("User created successfully"); //Scenario-3
    } else {
      response.status(400);
      response.send("Password is too short"); //Scenario-2
    }
  } else {
    response.status(400);
    response.send("User already exists"); //Scenario-1
  }
});

//API-2: Login

//Scenario-1: If an unregistered user tries to login - Invalid user
//Scenario-2: If the user provide incorrect password - Invalid Password
//Scenario-3: Successful login of the user - Login success!

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const checkUserQuery = `
  SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await database.get(checkUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user"); //Scenario-1
  } else {
    const isPasswordMatch = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatch === true) {
      response.send("Login success!"); //Scenario-3
    } else {
      response.status(400);
      response.send("Invalid password"); //Scenario-2
    }
  }
});

//API-3: Change Password

//Scenario-1: If the user provides incorrect current password
//Scenario-2: If the user provides new password with less than 5 characters
//Scenario-3: Successful password update

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const checkUserQuery = `
  SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await database.get(checkUserQuery);

  if (dbUser !== undefined) {
    const isPasswordValid = await bcrypt.compare(oldPassword, dbUser.password);
    if (isPasswordValid) {
      if (newPassword.length > 5) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `UPDATE user SET
        password = '${hashedPassword}' WHERE username = '${username}'`;
        const updatePasswordResponse = await database.run(updatePasswordQuery);
        response.send("Password updated"); //Scenario-3
      } else {
        response.status(400);
        response.send("Password is too short"); //Scenario-2
      }
    } else {
      response.status(400);
      response.send("Invalid current password"); //Scenario-1
    }
  } else {
    response.status(400);
    response.send("Invalid user"); // Scenario-4
  }
});

module.exports = app;
