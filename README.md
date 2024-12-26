This is a backend server for Task Manager app (https://github.com/Snowrk/task-manager.git) built using Node.js

## Getting Started

First install dependencies

```
npm install
```

It is recommended to connect your own MongoDB database as I am using the free version and it might run out of limit.

To connect your own MongoDB database read [Connect to MongoDB using Node.js Driver](https://www.mongodb.com/docs/drivers/node/current/)

After the database connection, run the development server:

```bash
node ./api/index.js
# or
nodemon ./api/index.js
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

## Learn More

To learn more about Node.js, take a look at the following resources:

- [Node.js Documentation](https://nodejs.org/docs/latest/api/) - learn about Node.js.
- [Learn Node.js](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs) - a detailed blog post.
