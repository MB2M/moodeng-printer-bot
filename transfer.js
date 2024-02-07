import {
  createTransferCheckedInstruction,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { getTokenOwners } from "./getTokenOwners.js";

export const createAllTransferTxs = async (
  connection,
  ignoredAccountsAddress,
  jupRewards,
  fromTokenAccount,
  mintAddress,
  rewardAddress,
  jupQuantity,
  programId,
  redisClient,
  teamRewardTokenAccount,
  teamPart,
) => {
  const accounts = await getTokenOwners(connection, mintAddress);
  //

  const filteredAccounts = accounts.filter(
    (acc) =>
      !ignoredAccountsAddress.includes(acc.tokenAccountAddress.toString()),
  );

  // console.log("accounts", accounts);
  // console.log("filteredAccounts", filteredAccounts);

  const ignoredAccounts = accounts
    .filter((acc) =>
      ignoredAccountsAddress.includes(acc.tokenAccountAddress.toString()),
    )
    .reduce((a, b) => a + b.amountOwned, BigInt(0));
  // console.log(filteredAccounts);

  const totalMintToken = filteredAccounts.reduce(
    (a, b) => a + b.amountOwned,
    BigInt(0),
  );

  const txs = [];

  for (let acc of filteredAccounts) {
    const percent =
      Number((acc.amountOwned * 10000000000000000n) / totalMintToken) /
      10000000000000000;

    const amount = percent * Number(jupQuantity * (1 - teamPart));

    if (Math.floor(amount) === 0) continue;

    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      jupRewards,
      new PublicKey(rewardAddress),
      acc.account,
      true,
      "confirmed",
    );

    txs.push(
      createTransferCheckedInstruction(
        fromTokenAccount.address,
        new PublicKey(rewardAddress),
        userTokenAccount.address,
        jupRewards.publicKey, // from's owner
        Math.floor(amount), // amount, if your deciamls is 8, send 10^8 for 1 token
        6, // decimals
        [],
        programId,
      ),
    );
  }

  txs.push(
    createTransferCheckedInstruction(
      fromTokenAccount.address,
      new PublicKey(rewardAddress),
      teamRewardTokenAccount.address,
      jupRewards.publicKey, // from's owner
      Math.floor(jupQuantity * teamPart), // amount, if your deciamls is 8, send 10^8 for 1 token
      6, // decimals
      [],
      programId,
    ),
  );

  const currentTxs = JSON.parse(await redisClient.get("txs"));
  await redisClient.set("txs", JSON.stringify([...(currentTxs || []), ...txs]));

  return txs;
};
