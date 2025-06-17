require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

// firebase admin
const admin = require("firebase-admin");
const decodedServiceKey = Buffer.from(
  process.env.FIREBASE_SERVICE_KEY,
  "base64"
).toString("utf8");

const serviceAccount = JSON.parse(decodedServiceKey);

// middleware
app.use(cors());
app.use(express.json());

// mongodb
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  Timestamp,
} = require("mongodb");
const uri = process.env.DB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// verify token
const verifyFireBaseToken = async (req, res, next) => {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).send({ message: "unauthorized access" });
  }
};

// verify user email
const verifyTokenEmail = async (req, res, next) => {
  if (req.query.email !== req.user.email) {
    return res.status(403).send({ message: "forbidden access" });
  }
  next();
};

async function run() {
  try {
    const dataBase = client.db("TraVoa_DB");
    // collections
    const roomsCollection = dataBase.collection("rooms");
    const reviewCollection = dataBase.collection("allReview");

    // rooms API with price range
    app.get("/rooms", async (req, res) => {
      const { minPrice, maxPrice } = req.query;
      const minPriceNum = parseInt(minPrice);
      const maxPriceNum = parseInt(maxPrice);
      if (minPrice && maxPrice) {
        const result = await roomsCollection
          .find({ price: { $gte: minPriceNum, $lte: maxPriceNum } })
          .toArray();
        res.send(result);
      } else {
        const result = await roomsCollection.find().toArray();
        res.send(result);
      }
    });

    //featured rooms API
    app.get("/featured", async (req, res) => {
      const result = await roomsCollection
        .aggregate([
          {
            $addFields: {
              reviewCount: { $size: "$reviews" },
            },
          },
          {
            $sort: { reviewCount: -1 },
          },
          {
            $limit: 6,
          },
        ])
        .toArray();
      res.send(result);
    });

    // room details API
    app.get("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.findOne(query);
      res.send(result);
    });

    // update rooms API based on bookings room
    app.patch("/bookedRooms/:roomId", async (req, res) => {
      const id = req.params.roomId;
      const filter = { _id: new ObjectId(id) };
      const UpdateRoomData = req.body;
      const options = { upsert: true };
      const updatedDoc = {
        $set: UpdateRoomData,
      };
      const result = await roomsCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    // my bookings API
    app.get(
      "/myBookings",
      verifyFireBaseToken,
      verifyTokenEmail,
      async (req, res) => {
        const { email } = req.query;

        const query = {
          bookedUser: email,
        };
        const result = await roomsCollection.find(query).toArray();
        res.send(result);
      }
    );

    // post review API
    app.patch("/review/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const postReview = req.body;
      const updateDoc = {
        $addToSet: { reviews: postReview },
      };
      const result = await roomsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // update date API
    app.patch("/updateDate/:id", async (req, res) => {
      const { id } = req.params;
      const filter = { _id: new ObjectId(id) };
      const updatedDate = req.body.dateData;
      const updateDoc = {
        $set: { bookedDate: updatedDate },
      };
      const result = await roomsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // cancel booking API
    app.patch("/cancelBooking/:id", async (req, res) => {
      const { id } = req.params;
      const filter = { _id: new ObjectId(id) };
      const cancelBooking = {
        $set: { available: true },
        $unset: { bookedDate: "", bookedUser: "" },
      };
      const result = await roomsCollection.updateOne(filter, cancelBooking);
      res.send(result);
    });

    // post all review API
    app.post("/allReview", async (req, res) => {
      const reviewInfo = req.body;
      const result = await reviewCollection.insertOne(reviewInfo);
      res.send(result);
    });

    // get all review API
    app.get("/allReview", async (req, res) => {
      const result = await reviewCollection
        .find()
        .sort({ timeStamp: -1 })
        .toArray();
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
