const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const formidableMiddleware = require("express-formidable");
const cors = require("cors");
const helmet = require("helmet");
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

const app = express();

app.use(helmet());
app.use(formidableMiddleware());
app.use(cors());

mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost/airbnb-api", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false,
});

const userRoutes = require("./routes/user");
const roomsRoutes = require("./routes/room");
app.use(userRoutes);
app.use(roomsRoutes);

// models
const Room = require("./models/Room");
const User = require("./models/User");

const roomsData = require("./data/rooms.json");
const usersData = require("./data/users.json");

// Function to save data in DB
const saveData = async (data, model) => {
  if (model === "room") {
    // save rooms data
    for (let i = 0; i < data.length; i++) {
      const room = await Room.findById(data[i]._id);
      if (!room) {
        const newRoom = new Room({
          _id: data[i]._id,
          title: data[i].title,
          description: data[i].description,
          price: data[i].price,
          ratingValue: data[i].ratingValue,
          reviews: data[i].reviews,
          loc: {
            lat: data[i].loc.lat,
            lng: data[i].loc.lng,
          },
          photos: data[i].photos,
          user: data[i].user,
        });
        await newRoom.save();
      }
    }
  }
  if (model === "user") {
    // save users data
    for (let i = 0; i < data.length; i++) {
      const user = await User.findById(data[i]._id);
      if (!user) {
        const token = uid2(64);
        const password = uid2(12);
        const salt = uid2(64);
        const hash = SHA256(password + salt).toString(encBase64);
        const newUser = new User({
          _id: data[i]._id,
          email: data[i].email,
          token: token,
          salt: salt,
          hash: hash,
          account: {
            username: data[i].account.username,
            name: data[i].account.name,
            description: data[i].account.description,
            photo: data[i].account.photo,
          },
          rooms: data[i].rooms,
        });
        await newUser.save();
      }
    }
  }
};

saveData(roomsData, "room");
saveData(usersData, "user");

// Function to erase data in DB
const eraseData = async (collection) => {
  if (collection === "rooms") {
    await Room.deleteMany();
    console.log("All rooms deleted");
  }
  if (collection === "users") {
    await User.deleteMany();
    console.log("All users deleted");
  }
};

// eraseData("rooms");
// eraseData("users");

app.get("/", function (req, res) {
  res.send("Welcome to the Airbnb API.");
});

app.all("*", function (req, res) {
  res.status(404).json({ error: "Page not found" });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server has started");
});
