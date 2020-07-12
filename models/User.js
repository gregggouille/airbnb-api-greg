const mongoose = require("mongoose");

const User = mongoose.model("User", {
  email: { type: String, required: true, unique: true },
  token: String,
  hash: String,
  salt: String,
  account: {
    username: { type: String, required: true, unique: true },
    name: String,
    description: String,
    photo: Object,
  },
  rooms: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
    },
  ],
});

module.exports = User;
// const mongoose = require("mongoose");

// const User = mongoose.model("User", {
//   nom: String,
//   prenom: String,
//   email: String,
//   phone: String,
//   adress: String,
//   cp: String,
//   ville: String,
//   salt: String,
//   hash: String,
//   token: String,
// });

// module.exports = User;
