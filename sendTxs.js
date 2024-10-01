import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import nacl from "tweetnacl";
import { sleep } from "./sleep.js";
import { decodeTransferInstructionUnchecked } from "@solana/spl-token";

export const sendTxs = async (connection, jupRewards, redisClient) => {
  const txs = JSON.parse(await redisClient.get("txs"));
  const chunkSize = 15;

  let done = false;
  let chunkTxs = [];

  while (txs?.length > 0) {
    if (!done && chunkTxs?.length > 0) {
      txs.push(chunkTxs);
    }

    chunkTxs = txs.splice(0, chunkSize);

    const blockhashResponse =
      await connection.getLatestBlockhashAndContext("finalized");
    const lastValidBlockHeight = blockhashResponse.context.slot + 150;

    const txInstructions = chunkTxs.map((tx) => {
      return new TransactionInstruction({
        keys: tx.keys.map((key) => ({
          ...key,
          pubkey: new PublicKey(key.pubkey),
        })),
        programId: new PublicKey(tx.programId),
        data: Buffer.from(tx.data),
      });
    });

    const transferTransaction = new Transaction({
      feePayer: jupRewards.publicKey,
      blockhash: blockhashResponse.value.blockhash,
      lastValidBlockHeight: lastValidBlockHeight,
    }).add(...txInstructions);

    const message = transferTransaction.serializeMessage();
    const signature = nacl.sign.detached(message, jupRewards.secretKey);
    transferTransaction.addSignature(
      jupRewards.publicKey,
      Buffer.from(signature),
    );
    const transferRawTransaction = transferTransaction.serialize();
    let blockheight = await connection.getBlockHeight();

    done = false;
    while (!done && blockheight < lastValidBlockHeight) {
      try {
        const txId = await connection.sendRawTransaction(
          transferRawTransaction,
          {
            // skipPreflight: true,
          },
        );
        await connection.confirmTransaction(txId);
        console.log(`TRANSFER: https://solscan.io/tx/${txId}`);
        done = true;
        // const currentTxs = JSON.parse(await client.get("txs"));
        // currentTxs.pop();
        // await client.set("txs", JSON.stringify([...(currentTxs || [])]))
        //;

        txInstructions.forEach((tx) => {
          const { keys, data } = decodeTransferInstructionUnchecked(tx);
          const amount = data.amount;
          const dest = keys.owner.pubkey.toString();
          redisClient
            .get(dest)
            .then((val) => (val ? BigInt(val) : 0n))
            .then((data) => redisClient.set(dest, (data + amount).toString()));
        });

        await redisClient.set("txs", JSON.stringify([...txs]));
      } catch (err) {
        console.log(`retrying to confirm transaction:`, err);
        if (
          err.message.includes("This transaction has already been processed")
        ) {
          done = true;
          await redisClient.set("txs", JSON.stringify([...txs]));
          continue;
        }

        if (
          err.message.includes(
            "Transaction simulation failed: Blockhash not found",
          )
        ) {
          done = true;
          continue;
        }

        await sleep(500);
        blockheight = await connection.getBlockHeight();
      }
    }
  }
};
