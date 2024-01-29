import env from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

env.config();
const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

db.connect();

// join db reviews/readers when implementing more readers

// function to find reader from reviews
async function getReader(reader) {
  const result = await db.query("SELECT id FROM readers WHERE name = $1", [
    reader,
  ]);
  return result.rows[0].id;
}

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});

app.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM reviews");
    // console.log(result.rows);
    res.render("index.ejs", { reviews: result.rows });
  } catch (err) {
    console.log(err);
  }
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

// test data
// A Big Ship at the Edge of the Universe
// The characters are captivating; their stories soon become the heart of the adventure.
