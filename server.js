import express from "express";
import https from "https";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import fs from "fs";

dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(cors());

const options = {
  key: fs.readFileSync("certificate/server.key"), // Use your key file
  cert: fs.readFileSync("certificate/server.cert"), // Use your cert file
};

app.get("/test", (req, res) => {
  res.status(200).json({ MSG: "Server is runnning :)" });
});

https.createServer(options, app).listen(443, () => {
  console.log("HTTPS Server running on https://localhost:443");
});

http.createServer((req, res) => {
  res.writeHead(301, { "Location": "https://" + req.headers.host + req.url });
  res.end();
}).listen(80, () => {
  console.log("HTTP Server running on http://localhost:80 (Redirects to HTTPS)");
});