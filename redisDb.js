import { createClient } from "redis";

const client = await createClient({
  url: `redis://default:YfYWc43YHgheyHKGtghzEIerCL0ZZFoM@redis-16420.c300.eu-central-1-1.ec2.redns.redis-cloud.com:16420`,
  // password: "l1suYJD25EXwdskrTnIFQnjlCdWjv0yB",
  // socket: {
  //   host: "redis-10803.c311.eu-central-1-1.ec2.cloud.redislabs.com",
  //   port: 10803,
  // },
});

// await client.connect();
// console.log("Connected to redis");
export default client;
