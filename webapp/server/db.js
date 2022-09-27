// configure connection to postgres
// use dotenv to secure environment variables

const Pool = require("pg").Pool;
const pool = new Pool();

// const pool = new Pool({
// 	user: "postgres",
// 	password: "password",
// 	host: "localhost",
// 	port: 5432,
// 	database: "test"
// });

module.exports = pool;
