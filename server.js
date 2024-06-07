import express from "express";
import { db } from "./db.js";

export const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM reviews WHERE stars >= 4");
    for (let i = 0; i < result.rows.length; i++) {
      const nameRes = await db.query("SELECT name FROM readers WHERE id = $1", [
        result.rows[i].reader_id,
      ]);

      result.rows[i].name = nameRes.rows[0].name;
    }
    res.render("index.ejs", { reviews: result.rows });
  } catch (err) {
    console.log(err);
  }
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

router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

router.get("/account", async (req, res) => {
  if (req.isAuthenticated()) {
    const result = await db.query(
      "SELECT * FROM reviews WHERE reader_id = $1",
      [req.user.id]
    );
    res.render("account.ejs", { reviews: result.rows, user: req.user.name });
  } else {
    res.redirect("/login");
  }
});

router.get("/reviews", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM reviews");
    for (let i = 0; i < result.rows.length; i++) {
      const nameRes = await db.query("SELECT name FROM readers WHERE id = $1", [
        result.rows[i].reader_id,
      ]);
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
