const express = require("express");

const app = express();

app.listen(process.env.SERVER_PORT, (err) => {
  console.log("Unable to start server! \nError occured: ", err);
});
