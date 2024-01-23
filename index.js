import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// const db = new pg.Client({
//   name: "postgres",
//   host: "localhost",
//   database: "",
//   password: "",
//   port: 5432,
// });

// db.connect();

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});

app.get("/", (req, res) => {
  res.render("index.ejs");
});
