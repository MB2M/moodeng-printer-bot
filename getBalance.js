import { PublicKey } from "@solana/web3.js";

export const getBalance = async (connection, accountTokenAddress) => {
  const balance = await connection.getTokenAccountBalance(
    new PublicKey(accountTokenAddress),
  );
  return balance.value.amount;
};
