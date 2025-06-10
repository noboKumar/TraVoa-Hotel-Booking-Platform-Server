require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.port || 3000;

// middleware
app.use(cors());
app.use(express.json());

// mongodb
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.DB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const dataBase = client.db("TraVoa_DB");
    // collections
    const roomsCollection = dataBase.collection("rooms");

    // rooms API
    app.get("/rooms", async (req, res) => {
      const result = await roomsCollection.find().toArray();
      res.send(result);
    });

    // room details API
    app.get("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.findOne(query);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is Running...");
});

app.listen(port, () => {
  console.log(`server is running on port: ${port}`);
});
