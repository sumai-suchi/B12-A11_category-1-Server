const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

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

    app.get("/user/role/:email", async (req, res) => {
      const { email } = req.params;
      console.log(email);
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.post("/blood-donation-request", async (req, res) => {
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
