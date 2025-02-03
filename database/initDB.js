import mysql from "mysql2/promise";

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PWD,
};

async function initializeDatabase() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log("Connected to MySQL server!");

    await connection.query("CREATE DATABASE IF NOT EXISTS sustainDB;");
    console.log("Database 'sustainDB' initialised");

    await connection.query("USE sustainDB;");

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS sustainmetrics (
        convid VARCHAR(255) PRIMARY KEY,
        energy DECIMAL(10,2) NOT NULL,
        water DECIMAL(10,2) NOT NULL,
        co2emission DECIMAL(10,2) NOT NULL
      );
    `;

    await connection.query(createTableQuery);
    console.log("Table 'sustainmetrics' ensured");

    await connection.end();
    console.log("Database initialization complete 🚀");

  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

export default initializeDatabase;