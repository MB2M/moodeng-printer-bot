import { PublicKey } from "@solana/web3.js";

export const getSupply = async (connection, mintAddress) => {
  const supply = await connection.getTokenSupply(new PublicKey(mintAddress));
  return supply.value.amount;
};
