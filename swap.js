import { VersionedTransaction } from "@solana/web3.js";
import { sleep } from "./sleep.js";

export const swap = async (
  connection,
  jupRewards,
  mintAddress,
  quantity,
  toAddress,
) => {
  // const balance = await getBalance(connection, tokenAccount);
  // await connection.getTokenAccountBalance(
  //   new PublicKey("J1pS5cDFxPSdS37mZc4gxEEQWTiQ2wzNXcroUU6hPj3k"),
  // );

  // SWAP
  const quoteResponse = await (
    await fetch(
      `https://quote-api.jup.ag/v6/quote?inputMint=${mintAddress}&outputMint=${toAddress}amount=${quantity}&slippageBps=3000`,
    )
  ).json();

  console.log("quoteResponse:", quoteResponse);

  if (quoteResponse.error) return;

  const { swapTransaction } = await (
    await fetch("https://quote-api.jup.ag/v6/swap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // quoteResponse from /quote api
        quoteResponse,
        // user public key to be used for the swap
        userPublicKey: jupRewards.publicKey.toString(),
        // auto wrap and unwrap SOL. default is true
        // wrapAndUnwrapSol: true, c
        // asLegacyTransaction:true,
        dynamicComputeUnitLimit: true, // allow dynamic compute limit instead of max 1,400,000
        // custom priority fee
        prioritizationFeeLamports: "auto", // or custom lamports: 1000
        // skipUserAccountsRpcCalls:true,
        // autoMultiplier:10
        // feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
        // feeAccount: "fee_account_public_key"
      }),
    })
  ).json();

  // deserialize the transaction
  const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
  const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

  // sign the transaction
  transaction.sign([jupRewards]);

  // Execute the transaction
  const rawTransaction = transaction.serialize();
  let blockheight = await connection.getBlockHeight();
  const blockhashResponse = await connection.getLatestBlockhashAndContext();
  const lastValidBlockHeight = blockhashResponse.context.slot + 150;

  let done = false;
  while (!done && blockheight < lastValidBlockHeight) {
    try {
      const txId = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
      });
      await connection.confirmTransaction(txId);
      console.log(`SWAP: https://solscan.io/tx/${txId}`);
      done = true;
    } catch (err) {
      console.log(`retrying to confirm transaction :${err}`);
      await sleep(500);
      blockheight = await connection.getBlockHeight();
    }
  }
};
