const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

const admin = require("firebase-admin");

const decoded = Buffer.from(process.env.FB_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyFBToken = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).send({ message: "unauthorize access" });
  }
  try {
    const idToken = token.split(" ")[1];
    console.log(idToken);
    const decoded = await admin.auth().verifyIdToken(idToken);
    console.log("decoded id token", decoded);
    req.decoded_email = decoded.email;
    next();
  } catch (error) {
    return res.status(401).send({ message: "unauthorize access" });
  }
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cgi21.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const database = client.db("BloodDonationDB");
    const userCollection = database.collection("user");
    const bloodDonationRequest = database.collection("donationRequest");

    app.post("/user", async (req, res) => {
      const userInfo = req.body;
      userInfo.role = "donor";
      userInfo.status = "active";
      userInfo.createdAt = new Date();

      const result = await userCollection.insertOne(userInfo);

      res.send(result);
    });

    app.get("/user", verifyFBToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/user/role/:email", async (req, res) => {
      const { email } = req.params;
      console.log(email);
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.get("/my-donation-request", verifyFBToken, async (req, res) => {
      const { limit } = req.query;
      const email = req.decoded_email;
      console.log(email);
      const query = { requesterEmail: email };
      const limitNum = Number(limit) || 0;
      console.log(limitNum);
      console.log(limit);
      const result = await bloodDonationRequest
        .find(query)
        .limit(limitNum)
        .toArray();
      return res.send(result);
    });

    app.patch("/update/user/status", verifyFBToken, async (req, res) => {
      const { email, status } = req.query;
      const query = { email: email };
      const updateStatus = {
        $set: {
          status: status,
        },
      };

      const result = await userCollection.updateOne(query, updateStatus);
      return res.send(result);
    });
    app.patch("/update/userRequest/status", verifyFBToken, async (req, res) => {
      const { donationStatus, id } = req.query;
      console.log(donationStatus, id);
      const query = { _id: new ObjectId(id) };
      const updateStatus = {
        $set: {
          donationStatus: donationStatus,
        },
      };

      const result = await bloodDonationRequest.updateOne(query, updateStatus);
      return res.send(result);
    });

    app.get("/userRequest/:id", verifyFBToken, async (req, res) => {
      const { id } = req.params;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await bloodDonationRequest.findOne(query);
      res.send(result);
    });

    app.patch(
      "/update/singleUserRequest/:id",
      verifyFBToken,
      async (req, res) => {
        const { id } = req.params;
        console.log(id);
        const query = { _id: new ObjectId(id) };
        const userInfo = req.body;
        console.log(userInfo);
        const UpdateOne = {
          $set: {
            requesterName: userInfo.requesterName,
            requesterEmail: userInfo.requesterEmail,
            recipientName: userInfo.recipientName,
            district: userInfo.district,
            upazila: userInfo.upazila,
            hospitalName: userInfo.hospitalName,
            address: userInfo.address,
            bloodGroup: userInfo.bloodGroup,
            donationDate: userInfo.donationDate,
            donationTime: userInfo.donationTime,
            requestMessage: userInfo.requestMessage,
            donationStatus: userInfo.donationStatus,
          },
        };
        const result = await bloodDonationRequest.updateOne(query, UpdateOne);
        console.log(userInfo);
        res.send(result);
      }
    );

    app.post("/blood-donation-request", verifyFBToken, async (req, res) => {
      const DonationRequesterInfo = req.body;

      const result = await bloodDonationRequest.insertOne(
        DonationRequesterInfo
      );
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("mongoDb is running on 500");
});

app.listen(port, () => {
  console.log(`server is running on this port ${port}`);
});
