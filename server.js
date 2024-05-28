import express from "express";
import pg from "pg";
import env from "dotenv";

env.config();

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

db.connect();

export const router = express.Router();

router.get("/", async (req, res) => {
  res.render("index.ejs");
});

router.get("/search", (req, res) => {
  res.render("search.ejs");
});

router.get("/post", isLoggedIn, (req, res) => {
  res.render("post.ejs");
});

router.get("/login", (req, res) => {
  res.render("login.ejs");
});

router.get("/signup", (req, res) => {
  res.render("signup.ejs");
});

router.get("/feedback", (req, res) => {
  res.render("feedback.ejs");
});

router.get("/account", async (req, res) => {
  // console.log(req.user);
  if (req.isAuthenticated()) {
    const result = await db.query(
      "SELECT * FROM reviews WHERE reader_id = $1",
      [req.user.id]
    );
    res.render("account.ejs", { reviews: result.rows });
  } else {
    res.redirect("/login");
  }
});

router.get("/reviews", async (req, res) => {
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

    res.render("reviews.ejs", { reviews: result.rows });
  } catch (err) {
    console.log(err);
  }
});

function isLoggedIn(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.redirect("/login");
  }
}
