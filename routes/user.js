const express = require("express");
const router = express.Router();
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const cloudinary = require("cloudinary").v2;

const User = require("../models/User");
const Room = require("../models/Room");

const isAuthenticated = require("../middlewares/isAuthenticated");
const noModification = require("../middlewares/noModification");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* User signup */
router.post("/user/sign_up", async (req, res) => {
  try {
    const userEmail = await User.findOne({ email: req.fields.email });

    const userUsername = await User.findOne({
      "account.username": req.fields.username,
    });

    if (userEmail) {
      res.status(400).json({ error: "This email already has an account." });
    } else if (userUsername) {
      res.status(400).json({ error: "This username already has an account." });
    } else {
      if (
        req.fields.email &&
        req.fields.username &&
        req.fields.password &&
        req.fields.name &&
        req.fields.description
      ) {
        const token = uid2(64);
        const salt = uid2(64);
        const hash = SHA256(req.fields.password + salt).toString(encBase64);

        const newUser = new User({
          email: req.fields.email,
          token: token,
          salt: salt,
          hash: hash,
          account: {
            username: req.fields.username,
            description: req.fields.description,
            name: req.fields.name,
          },
        });

        await newUser.save();
        res.json({
          _id: newUser._id,
          token: newUser.token,
          email: newUser.email,
          username: newUser.account.username,
          description: newUser.account.description,
          name: newUser.account.name,
        });
      } else {
        res.status(400).json({ error: "Missing parameters" });
      }
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/* User login */
router.post("/user/log_in", async (req, res) => {
  if (req.fields.password && req.fields.email) {
    const user = await User.findOne({
      email: req.fields.email,
    });
    if (user) {
      if (
        SHA256(req.fields.password + user.salt).toString(encBase64) ===
        user.hash
      ) {
        res.json({
          _id: user._id,
          token: user.token,
          email: user.email,
          username: user.account.username,
          description: user.account.description,
          name: user.account.name,
        });
      } else {
        res.status(401).json({ error: "Unauthorized" });
      }
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  } else {
    res.status(400).json({ error: "Missing parameters" });
  }
});

/* Get one user */
router.get("/users/:id", async (req, res) => {
  if (req.params.id) {
    try {
      const user = await User.findById(req.params.id);

      if (user) {
        res.json({
          _id: user._id,
          account: user.account,
          rooms: user.rooms,
        });
      } else {
        res.json({ message: "User not found" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: "Missing id" });
  }
});

/* Get rooms of one user */
router.get("/user/rooms/:id", async (req, res) => {
  if (req.params.id) {
    try {
      const user = await User.findById(req.params.id);
      if (user) {
        const userRooms = user.rooms;

        if (userRooms.length > 0) {
          let tab = [];

          for (let i = 0; i < userRooms.length; i++) {
            const room = await Room.findById(userRooms[i]);

            tab.push(room);
          }

          res.json(tab);
        } else {
          res.status(200).json({ message: "This user has no room" });
        }
      } else {
        res.json({ message: "User not found" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: "Missing id" });
  }
});

/* Update user (except pictures & password) */
router.put(
  "/user/update/:id",
  [noModification, isAuthenticated],
  async (req, res) => {
    if (req.params.id) {
      try {
        const user = await User.findById(req.params.id);

        if (user) {
          const userId = req.user._id;

          if (String(userId) === String(req.params.id)) {
            const email = await User.findOne({ email: req.fields.email });

            const username = await User.findOne({
              "account.username": req.fields.username,
            });

            if (email) {
              return res
                .status(400)
                .json({ message: "This email is already used." });
            }

            if (username) {
              return res
                .status(400)
                .json({ message: "This username is already used." });
            }

            if (
              req.fields.email ||
              req.fields.description ||
              req.fields.username ||
              req.fields.name
            ) {
              if (req.fields.email) {
                const userToUpdate = await User.findByIdAndUpdate(
                  req.params.id,
                  {
                    email: req.fields.email,
                  }
                );
                await userToUpdate.save();
              }

              if (req.fields.name) {
                const userToUpdate = await User.findByIdAndUpdate(
                  req.params.id,
                  {
                    "account.name": req.fields.name,
                  }
                );
                await userToUpdate.save();
              }

              if (req.fields.username) {
                const userToUpdate = await User.findByIdAndUpdate(
                  req.params.id,
                  {
                    "account.username": req.fields.username,
                  }
                );
                await userToUpdate.save();
              }

              if (req.fields.description) {
                const userToUpdate = await User.findByIdAndUpdate(
                  req.params.id,
                  {
                    "account.description": req.fields.description,
                  }
                );
                await userToUpdate.save();
              }

              const userUpdated = await User.findById(req.params.id);
              res.json({
                _id: userUpdated._id,
                email: userUpdated.email,
                account: userUpdated.account,
                rooms: userUpdated.rooms,
              });
            } else {
              res.send("Missing parameter(s)");
            }
          } else {
            res.status(401).json({ error: "Unauthorized" });
          }
        } else {
          res.status(400).json({ error: "User not found" });
        }
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    } else {
      res.status(400).json({ error: "Missing user id" });
    }
  }
);

/* Update user password */
router.put("/user/update_password", isAuthenticated, async (req, res) => {
  if (req.fields.previousPassword && req.fields.newPassword) {
    try {
      const user = await User.findById(req.user._id);

      if (user) {
        if (
          SHA256(req.fields.previousPassword + user.salt).toString(
            encBase64
          ) === user.hash
        ) {
          if (
            SHA256(req.fields.previousPassword + user.salt).toString(
              encBase64
            ) !== SHA256(req.fields.newPassword + user.salt).toString(encBase64)
          ) {
            const salt = uid2(64);
            const hash = SHA256(req.fields.newPassword + salt).toString(
              encBase64
            );

            const userToUpdate = await User.findByIdAndUpdate(req.user._id, {
              salt: salt,
              hash: hash,
            });
            await userToUpdate.save();

            res.json({
              message: "Password successfully modified",
            });
          } else {
            res.status(401).json({
              error: "Previous password and new password must be different",
            });
          }
        } else {
          res.status(401).json({ error: "Wrong previous password" });
        }
      } else {
        res.status(400).json({ error: "User not found" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    return res.status(400).json({ message: "Missing parameters" });
  }
});

/* Send link to change password */
router.post("/user/recover_password", async (req, res) => {
  if (req.fields.email) {
    try {
      const user = await User.findOne({ email: req.fields.email });

      if (user) {
        const userEmail = user.email;
        const userToken = user.token;

        const mg = mailgun({
          apiKey: MAILGUN_API_KEY,
          domain: MAILGUN_DOMAIN,
        });

        const data = {
          from: "Airbnb API <postmaster@" + MAILGUN_DOMAIN + ">",
          to: userEmail,
          subject: "Change your password on Airbnb",
          text: `Please, click on the following link to change your password : https://airbnb/change_password?token=${userToken}`,
        };

        mg.messages().send(data, function (error, body) {
          // console.log(body);
          // console.log(error);
        });

        res.json({ message: "A link has been sent to the user" });
      } else {
        return res.status(400).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    return res.status(400).json({ message: "Missing email" });
  }
});

/* User upload picture */
router.put(
  "/user/upload_picture/:id",
  [noModification, isAuthenticated],
  async (req, res) => {
    if (req.files.picture) {
      try {
        const user = await User.findById(req.params.id);

        if (user) {
          if (String(user._id) === String(req.user._id)) {
            if (!user.account.photo) {
              const newObj = {};

              await cloudinary.uploader.upload(
                req.files.picture.path,

                {
                  folder: "airbnb/" + req.params.id,
                },

                async function (error, result) {
                  newObj.url = result.secure_url;
                  newObj.picture_id = result.public_id;

                  await User.findByIdAndUpdate(req.params.id, {
                    "account.photo": newObj,
                  });
                }
              );
            } else {
              const newObj = {};

              await cloudinary.uploader.upload(
                req.files.picture.path,

                { public_id: user.account.photo.picture_id },

                async function (error, result) {
                  newObj.url = result.secure_url;
                  newObj.picture_id = result.public_id;

                  await User.findByIdAndUpdate(req.params.id, {
                    "account.photo": newObj,
                  });
                }
              );
            }

            const userUpdated = await User.findById(req.params.id);

            res.json({
              account: userUpdated.account,
              _id: userUpdated._id,
              email: userUpdated.email,
              rooms: userUpdated.rooms,
            });
          } else {
            res.status(401).json({ error: "Unauthorized" });
          }
        } else {
          res.status(400).json({ error: "User not found" });
        }
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    } else {
      res.status(400).json({ error: "Missing picture" });
    }
  }
);

/* User delete picture */
router.put(
  "/user/delete_picture/:id",
  [noModification, isAuthenticated],
  async (req, res) => {
    if (req.params.id) {
      try {
        const user = await User.findById(req.params.id);

        if (user) {
          if (String(user._id) === String(req.user._id)) {
            if (user.account.photo) {
              await cloudinary.uploader.destroy(user.account.photo.picture_id);

              await User.findByIdAndUpdate(req.params.id, {
                "account.photo": null,
              });

              const userUpdated = await User.findById(req.params.id);
              res.json({
                account: userUpdated.account,
                _id: userUpdated._id,
                email: userUpdated.email,
                rooms: userUpdated.rooms,
              });
            } else {
              res.status(400).json({ message: "No photo found" });
            }
          } else {
            res.status(401).json({ error: "Unauthorized" });
          }
        } else {
          res.status(400).json({ error: "User not found" });
        }
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    } else {
      // si l'id de l'utilisateur n'a pas été envoyé
      res.status(400).json({ error: "Missing user id" });
    }
  }
);

/* Delete user */
router.delete(
  "/user/delete/:id",
  [noModification, isAuthenticated],
  async (req, res) => {
    if (req.params.id) {
      try {
        const user = await User.findById(req.params.id);

        if (user) {
          if (String(req.user._id) === String(req.params.id)) {
            const rooms = await Room.find({ user: req.params.id });

            for (let i = 0; i < rooms.length; i++) {
              await Room.findByIdAndRemove(rooms[i]._id);
            }

            await User.findByIdAndRemove(req.params.id);

            res.status(200).json({ message: "User deleted" });
          } else {
            res.status(401).json({ error: "Unauthorized" });
          }
        } else {
          res.status(400).json({ error: "User not found" });
        }
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    } else {
      res.status(400).json({ error: "Missing user id" });
    }
  }
);

module.exports = router;
