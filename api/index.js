import { MongoClient } from "mongodb";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());
app.listen(3001, () => console.log("started in port 3001"));

const uri =
  "mongodb+srv://shinsan:5kmp60lRVx3wodUE@todo-users.8rdtq.mongodb.net/?retryWrites=true&w=majority&appName=todo-users";

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (e) {
    console.log(e);
  }
}
run().catch(console.dir);

const database = client.db("taskManager");
const users = database.collection("users");
users.createIndex({ username: 1 }, { unique: true });
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send({ err: "Invalid JWT Token" });
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send({ err: "Invalid JWT Token" });
      } else {
        request.payload = payload;
        next();
      }
    });
  }
};
app.get("/", (request, response) => {
  response.send("Welcome to TODO API");
});
app.post("/signup/", async (request, response) => {
  try {
    const { username, password } = request.body;
    const match = await users.findOne({ username: username });
    if (match) {
      response.status(400);
      response.send({ msg: "username already exists" });
    } else {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      const hashedPassword = await bcrypt.hash(password, 10);
      await users.insertOne({
        username: username,
        password: hashedPassword,
        taskList: [],
      });
      response.status(200);
      response.send({ jwtToken });
    }
  } catch (e) {
    console.log(e);
    response.status(500);
    response.send({ err: e });
  }
});
app.post("/login/", async (request, response) => {
  try {
    const { username, password } = request.body;
    const match = await users.findOne({ username: username });
    if (!match) {
      response.status(400);
      response.send({ err: "User does not exist" });
    } else {
      const isPasswordMatched = await bcrypt.compare(password, match.password);
      if (isPasswordMatched) {
        const payload = {
          username: username,
        };
        const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
        response.status(200);
        response.send({ jwtToken });
      } else {
        response.status(400);
        response.send({ err: "Incorrect Password" });
      }
    }
  } catch (error) {
    console.log(error);
    response.status(500);
    response.send({ err: error });
  }
});
app.get("/profile/", authenticateToken, async (request, response) => {
  try {
    const { username } = request.payload;
    const match = await users.findOne({ username: username });
    if (match) {
      response.status(200);
      response.send(match);
    } else {
      response.status(400);
      response.send({ err: "cannot find the user" });
    }
  } catch (error) {
    console.log(error);
    response.status(500);
    response.send({ err: error });
  }
});
app.put(
  "/editprofile/username",
  authenticateToken,
  async (request, response) => {
    try {
      const { username } = request.payload;
      const { newUsername } = request.body;
      const match = await users.findOne({ username: username });
      const exists = await users.findOne({ username: newUsername });
      if (!match) {
        response.status(400);
        response.send({ err: "cannot find the user" });
      } else if (exists) {
        response.status(401);
        response.send({ err: "username already exists" });
      } else {
        await users.updateOne(
          { username: username },
          { $set: { username: newUsername } }
        );
        response.status(200);
        response.send({ msg: "successfully updated" });
      }
    } catch (error) {
      console.log(error);
      response.status(500);
      response.send({ err: error });
    }
  }
);
app.put(
  "/editprofile/password",
  authenticateToken,
  async (request, response) => {
    try {
      const { username } = request.payload;
      const { password, pass } = request.body;
      const match = await users.findOne({ username: username });
      if (!match) {
        response.status(400);
        response.send({ err: "cannot find the user" });
      } else {
        const isPasswordMatched = await bcrypt.compare(pass, match.password);
        if (isPasswordMatched) {
          const hashedPassword = await bcrypt.hash(password, 10);
          await users.updateOne(
            { username: username },
            { $set: { password: hashedPassword } }
          );
          response.status(200);
          response.send({ msg: "Password changed successfully" });
        } else {
          response.status(400);
          response.send({ msg: "Incorrect previous password" });
        }
      }
    } catch (error) {
      console.log(error);
      response.status(500);
      response.send({ err: error });
    }
  }
);
app.get("/tasks/", authenticateToken, async (request, response) => {
  try {
    const { username } = request.payload;
    const match = await users.findOne({ username: username });
    if (match) {
      response.status(200);
      response.send(match.taskList ? match.taskList : []);
    } else {
      response.status(400);
      response.send({ err: "cannot find the user" });
    }
  } catch (error) {
    console.log(error);
    response.status(500);
    response.send({ err: error });
  }
});
app.post("/tasks/", authenticateToken, async (request, response) => {
  try {
    const { id, taskName, description, dueDate, status, priority } =
      request.body;
    const { username } = request.payload;
    const match = await users.findOne({ username: username });
    if (match) {
      const arr = match.taskList ? match.taskList : [];
      arr.push({ id, taskName, description, dueDate, status, priority });
      await users.updateOne(
        { username: username },
        { $set: { taskList: arr } }
      );
      response.status(200);
      response.send({ msg: "successfully added" });
    } else {
      response.status(400);
      response.send({ err: "cannot find user" });
    }
  } catch (error) {
    console.log(error);
    response.status(500);
    response.send({ err: error });
  }
});
app.put("/tasks/:id", authenticateToken, async (request, response) => {
  try {
    const { id } = request.params;
    const { taskName, description, dueDate, status, priority } = request.body;
    const { username } = request.payload;
    const match = await users.findOne({ username: username });
    if (match) {
      let arr = match.taskList;
      arr = arr.filter((task) => task.id !== id);
      arr.push({ id, taskName, description, dueDate, status, priority });
      await users.updateOne(
        { username: username },
        { $set: { taskList: arr } }
      );
      response.status(200);
      response.send({ msg: "Status successfully updated" });
    } else {
      response.status(400);
      response.send({ err: "cannot find user" });
    }
  } catch (error) {
    console.log(error);
    response.status(500);
    response.send({ err: error });
  }
});
app.delete("/tasks/:id", authenticateToken, async (request, response) => {
  try {
    const { id } = request.params;
    const { username } = request.payload;
    const match = await users.findOne({ username: username });
    if (match) {
      let arr = match.taskList;
      arr = arr.filter((task) => task.id !== id);
      await users.updateOne(
        { username: username },
        { $set: { taskList: arr } }
      );
      response.status(200);
      response.send({ msg: "successfully deleted" });
    } else {
      response.status(400);
      response.send({ err: "cannot find user" });
    }
  } catch (error) {
    console.log(error);
    response.status(500);
    response.send({ err: error });
  }
});

process.on("SIGINT", async () => {
  console.log("Gracefully shutting down...");
  try {
    await client.close(); // Close MongoDB connection
    console.log("MongoDB connection closed");
    process.exit(0); // Exit the process
  } catch (err) {
    console.error("Error while closing MongoDB connection", err);
    process.exit(1); // Exit with failure code
  }
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, shutting down gracefully...");
  try {
    await client.close();
    console.log("MongoDB connection closed");
    process.exit(0);
  } catch (err) {
    console.error("Error while closing MongoDB connection", err);
    process.exit(1);
  }
});
