import env from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

env.config();
const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

db.connect();

// join db reviews/readers when implementing more readers

// create new reader
async function createReader(reader) {
  await db.query("INSERT INTO readers (name) VALUES ($1)", [reader]);
}

// function to find reader from reviews
async function getReader(reader) {
  // console.log(reader);
  const result = await db.query("SELECT id FROM readers WHERE name = $1", [
    reader,
  ]);

  if (result.rows[0]) {
    return result.rows[0].id;
  } else {
    // throw new Error(`Reader doesn't exist`);
    await createReader(reader);
  }

  const resultNew = await db.query("SELECT id FROM readers WHERE name = $1", [
    reader,
  ]);
  return resultNew.rows[0].id;
}

app.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM reviews");
    // console.log(result.rows);
    res.render("index.ejs", { reviews: result.rows });
  } catch (err) {
    console.log(err);
  }
});

app.get("/search", (req, res) => {
  res.render("search.ejs");
});

app.get("/post", (req, res) => {
  res.render("post.ejs");
});

app.post("/review", async (req, res) => {
  try {
    const readerId = await getReader(req.body.reader);
    // console.log(readerId);
    await db.query(
      "INSERT INTO reviews (reader_id, title, author, review) VALUES ($1, $2, $3, $4)",
      [readerId, req.body.title, req.body.author, req.body.review]
    );
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.post("/search", async (req, res) => {
  const search = req.body["search-term"];
  const result = await axios.get(
    `https://openlibrary.org/search.json?q=${search}`
  );
  res.render("search", { results: result.data.docs });
});

// test data
// A Big Ship at the Edge of the Universe
// The characters are captivating; their stories soon become the heart of the adventure.

app.post("/delete", async (req, res) => {
  // console.log(req.body);
  const reviewId = req.body.deleteId.slice(-1);
  try {
    const result = await db.query("DELETE FROM reviews WHERE id = $1", [
      +reviewId,
    ]);
    res.redirect("/");
  } catch (err) {
    console.log(err.message);
  }
});

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
