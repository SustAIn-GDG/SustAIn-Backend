const { json } = require("body-parser");
const express = require("express");
const cors = require("cors");
require('dotenv').config()

const app = express();
app.use(json());
app.use(cors());

app.get("/test", (req, res) => {
  res.status(200).json({ MSG: "Server is runnning :)" });
});

app.listen(process.env.SERVER_PORT, (err) => {
  if (err) console.log("Unable to start server! \nError occured: ", err);
  else console.log("Server listening at PORT: ", process.env.SERVER_PORT);
});
