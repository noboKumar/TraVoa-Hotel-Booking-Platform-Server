const express = require("express");
const app = express();
const port = process.env.port || 3000;

app.get("/", (req, res) => {
  res.send("server is Running...");
});

app.listen(port, () => {
  console.log(`server is running on port: ${port}`);
});
