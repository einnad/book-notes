import env from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";

env.config();
const app = express();
const port = process.env.A_PORT || 3000;
const salts = 12;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
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
app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

db.connect();

// check isAuthenticated on each
function isLoggedIn(req, res, next) {
  if(req.user) {
    next();
  } else {
    res.redirect("/login");
  }
}

app.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM reviews");
    // console.log(result.rows);
    for (let i = 0; i < result.rows.length; i++) {
      const nameRes = await db.query("SELECT name FROM readers WHERE id = $1", [
        result.rows[i].reader_id,
      ]);
      // console.log(nameRes.rows);
      result.rows[i].name = nameRes.rows[0].name;
    }

    res.render("index.ejs", { reviews: result.rows });
  } catch (err) {
    console.log(err);
  }
});

app.get("/search", (req, res) => {
  res.render("search.ejs");
});

app.get("/post", isLoggedIn, (req, res) => {
  res.render("post.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});

app.get("/account", async (req, res) => {
  // console.log(req.user);
  if (req.isAuthenticated()) {
    const result = await db.query("SELECT * FROM reviews WHERE reader_id = $1", [req.user.id])
    res.render("account.ejs", { reviews: result.rows });
  } else {
    res.redirect("/login");
  }
});

app.post("/signup", async (req, res) => {
  try {
    const checkReader = await db.query(
      "SELECT * FROM readers WHERE email = $1",
      [req.body.email]
    );
    if (checkReader.rows > 0) {
      res.redirect("/login");
    } else {
      const hashPassword = await bcrypt.hash(req.body.password, salts);
      const result = await db.query(
        "INSERT INTO readers (name, email, password) VALUES ($1, $2, $3) RETURNING *",
        [req.body.name, req.body.email, hashPassword]
      );
      const reader = result.rows[0];
      res.login(reader, (err) => {
        console.log(err);
        res.redirect("/login");
      });
    }
  } catch (err) {
    console.log(err);
    res.redirect("/signup");
  }
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/account",
    failureRedirect: "/login",
  })
);

app.post("/review", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
    console.log(req.user);
    const readerID = req.user.id;
    await db.query("INSERT INTO reviews (reader_id, title, author, review) VALUES ($1, $2, $3, $4)",  [readerID, req.body.title, req.body.author, req.body.review]);
    res.redirect("/");
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
  // console.log(req.body);
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
