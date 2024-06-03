import env from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import { db } from "./db.js";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import { router } from "./server.js";

const app = express();
const port = process.env.A_PORT || 3000;
env.config();
const salts = +process.env.SALT_VALUE;

app.set("view engine", "ejs");
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // check for pg usage with true
    cookie: {
      maxAge: 1000 * 60 * 60, // change for testing
    },
  })
);
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(passport.initialize());
app.use(passport.session());

// check isAuthenticated on each
app.use(function (req, res, next) {
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});

app.use("/", router);

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/account",
    failureRedirect: "/login",
  })
);

app.post("/signup", async (req, res) => {
  try {
    const checkReader = await db.query(
      "SELECT * FROM readers WHERE email = $1",
      [req.body.email]
    );
    if (checkReader.rows > 0) {
      res.redirect("/login");
    } else {
      bcrypt.hash(req.body.password, salts, async (err, hashPassword) => {
        if (err) {
          console.error("Error handling the given password", err);
        } else {
          const result = await db.query(
            "INSERT INTO readers (name, email, password) VALUES ($1, $2, $3) RETURNING *",
            [req.body.name, req.body.email, hashPassword]
          );
          const reader = result.rows[0];
          req.login(reader, (err) => {
            console.log(err);
            res.redirect("/login");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/review", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const readerID = req.user.id;
      await db.query(
        "INSERT INTO reviews (reader_id, title, author, review, stars) VALUES ($1, $2, $3, $4, $5)",
        [
          readerID,
          req.body.title,
          req.body.author,
          req.body.review,
          req.body.stars,
        ]
      );
      res.redirect("/reviews");
    } catch (err) {
      console.log(err);
    }
  } else {
    res.redirect("/login");
  }
});

app.post("/search", async (req, res) => {
  const search = req.body["search-term"];
  const result = await axios.get(
    `https://openlibrary.org/search.json?q=${search}`
  );
  const data = result.data.docs;

  res.render("search", { results: data });
});

// NEEDS FIX - CHANGEOVER TO ACCOUNTS, SIMPLIFY FOR LOGGED IN STATE
app.post("/delete", async (req, res) => {
  const reviewId = req.body.deleteId.slice(-2);
  try {
    const result = await db.query("DELETE FROM reviews WHERE id = $1", [
      +reviewId,
    ]);
    res.redirect("/");
  } catch (err) {
    console.log(err.message);
  }
});

passport.use(
  "local",
  new Strategy({ usernameField: "email" }, async function verify(
    username,
    password,
    cb
  ) {
    try {
      const result = await db.query("SELECT * FROM readers WHERE email = $1", [
        username,
      ]);
      if (result.rows.length > 0) {
        const reader = result.rows[0];
        const hashPassword = reader.password;
        bcrypt.compare(password, hashPassword, (err, result) => {
          if (err) {
            return cb(err);
          } else {
            if (result) {
              return cb(null, reader);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      return cb(err);
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
