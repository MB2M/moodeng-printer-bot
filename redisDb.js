import { createClient } from "redis";

const client = await createClient({
  url: `redis://default:l1suYJD25EXwdskrTnIFQnjlCdWjv0yB@redis-10803.c311.eu-central-1-1.ec2.cloud.redislabs.com:10803`,
  // password: "l1suYJD25EXwdskrTnIFQnjlCdWjv0yB",
  // socket: {
  //   host: "redis-10803.c311.eu-central-1-1.ec2.cloud.redislabs.com",
  //   port: 10803,
  // },
});

// await client.connect();
// console.log("Connected to redis");
export default client;
