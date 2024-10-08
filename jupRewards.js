import { Keypair, PublicKey } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import dotenv from "dotenv";
import client from "./redisDb.js";
import cron from "node-cron";
import { connection } from "./connection.js";
import { collectFees } from "./collectFees.js";
import { sendTxs } from "./sendTxs.js";
import { swap } from "./swap.js";
import { getBalance } from "./getBalance.js";
import { getSupply } from "./getSupply.js";
import { createAllTransferTxs } from "./transfer.js";
import { createAllTokenAccounts } from "./tokenAccounts.js";

dotenv.config();

const quantityToSwap = async (connection, tokenAccount, mintAddress) => {
  const balance = await getBalance(connection, tokenAccount);
  const totalSupply = await getSupply(connection, mintAddress);

  const min = 0.001;
  const max = 0.002;

  console.log("balance: ", balance);
  console.log("totalSupply: ", totalSupply);

  if (BigInt(balance) * BigInt(1 / max) < BigInt(totalSupply)) {
    return 0;
  }
  return Math.floor((Math.random() * (max - min) + min) * totalSupply);
};

const main = async () => {
  await client.connect();

  const mintAddress = "GAHf6z3chHyqXp8GPh1hPbXhZCGk39Q92qCYC47Smo8M";
  const poolAddress = "ANESLFFYUcKbHKmNViwqb6MMUXRtnNdPKLNNitv6Azbv";
  const rewardAddress = "ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY";
  const teamAddress = "CUH9XDZNmXD8CGuhKznENCrA9TWVM4wKzWDmYxHFdTEG";

  const jupRewards = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(process.env.JUPREWARDS)),
  );

  const owner = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(process.env.JUPREWARDS)),
  );

  const jupRewardPrinterTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    jupRewards,
    new PublicKey(mintAddress),
    jupRewards.publicKey,
    false,
    "confirmed",
    {},
    TOKEN_2022_PROGRAM_ID,
  );

  const jupRewardRewardTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    jupRewards,
    new PublicKey(rewardAddress),
    jupRewards.publicKey,
    false,
    "confirmed",
  );

  const teamRewardTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    jupRewards,
    new PublicKey(rewardAddress),
    new PublicKey(teamAddress),
    false,
    "confirmed",
  );

  const poolTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    jupRewards,
    new PublicKey(mintAddress),
    new PublicKey(poolAddress),
    true,
    "confirmed",
    {},
    TOKEN_2022_PROGRAM_ID,
  );

  console.log("send undone transactions");
  await sendTxs(connection, jupRewards, client);
  console.log("...done");

  cron.schedule("*/30 * * * * *", async () => {
    try {
      console.log(`[${new Date().toISOString()}] Starting fees collection`);
      await collectFees(
        connection,
        owner,
        jupRewards,
        mintAddress,
        jupRewardPrinterTokenAccount,
      );
      console.log(`[${new Date().toISOString()}] Ending fees collection`);
    } catch (err) {
      console.error(err);
    }
  });

  // setInterval(async () => {
  cron.schedule("0 * * * *", async () => {
    try {
      console.log("starting swap");
      const quantity = await quantityToSwap(
        connection,
        jupRewardPrinterTokenAccount.address,
        mintAddress,
      );
      console.log("quantityToSwap:", quantity);
      if (quantity > 0) {
        await swap(
          connection,
          jupRewards,
          mintAddress,
          quantity,
          rewardAddress,
        );
      }
    } catch (err) {
      console.error(err);
    }
  });
  // }, 300000);

  cron.schedule("*/2 * * * *", async () => {
    await createAllTokenAccounts(
      connection,
      [
        poolTokenAccount.address.toString(),
        jupRewardPrinterTokenAccount.address.toString(),
      ],
      jupRewards,
      jupRewardRewardTokenAccount,
      mintAddress,
      rewardAddress,
      client,
    );
  });

  cron.schedule("10 * * * *", async () => {
    try {
      const quantityToTransfer = await getBalance(
        connection,
        jupRewardRewardTokenAccount.address,
      );
      console.log("quantityToTransfer:", quantityToTransfer);
      if (quantityToTransfer > 0) {
        await createAllTransferTxs(
          connection,
          [
            poolTokenAccount.address.toString(),
            jupRewardPrinterTokenAccount.address.toString(),
          ],
          jupRewards,
          jupRewardRewardTokenAccount,
          mintAddress,
          rewardAddress,
          quantityToTransfer,
          TOKEN_PROGRAM_ID,
          client,
          teamRewardTokenAccount,
          0.25,
        );
      }
      console.log("sending transactions");
      const sendNow = Date.now();
      await sendTxs(connection, jupRewards, client);
      console.log(`...done in ${(Date.now() - sendNow) / 1000} seconds`);
    } catch (err) {
      console.error(err);
    }
  });
};

main().catch((err) => {
  console.error(err);
  // client.disconnect();
});
