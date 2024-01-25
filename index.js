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

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});

app.get("/", (req, res) => {
  res.render("index.ejs");
});
