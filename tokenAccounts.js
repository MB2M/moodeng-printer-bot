import {
  createTransferCheckedInstruction,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { getTokenOwners } from "./getTokenOwners.js";

export const createAllTokenAccounts = async (
  connection,
  ignoredAccountsAddress,
  jupRewards,
  fromTokenAccount,
  mintAddress,
  rewardAddress,
  redisClient,
) => {
  const accounts = await getTokenOwners(connection, mintAddress);
  const filteredAccounts = accounts.filter(
    (acc) =>
      !ignoredAccountsAddress.includes(acc.tokenAccountAddress.toString()),
  );
  const ignoredAccounts = accounts
    .filter((acc) =>
      ignoredAccountsAddress.includes(acc.tokenAccountAddress.toString()),
    )
    .reduce((a, b) => a + b.amountOwned, BigInt(0));

  console.log("total account to get or create", filteredAccounts.length);
  let count = 0;
  for (let acc of filteredAccounts) {
    let currentLocked = JSON.parse(
      await redisClient.get("lockedForTokenAccountCreation"),
    );
    // go to next value
    if (currentLocked?.includes(acc.account.toString())) continue;
    await redisClient.set(
      "lockedForTokenAccountCreation",
      JSON.stringify([...(currentLocked || []), acc.account.toString()]),
    );
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      jupRewards,
      new PublicKey(rewardAddress),
      acc.account,
      true,
      "confirmed",
    );
    currentLocked = JSON.parse(
      await redisClient.get("lockedForTokenAccountCreation"),
    );
    await redisClient.set(
      "lockedForTokenAccountCreation",
      JSON.stringify([
        ...currentLocked.filter((c) => c !== acc.account.toString()),
      ]),
    );

    count += 1;
  }

  // txs.push(
  //   createTransferCheckedInstruction(
  //     fromTokenAccount.address,
  //     new PublicKey(rewardAddress),
  //     teamRewardTokenAccount.address,
  //     jupRewards.publicKey, // from's owner
  //     Math.floor(jupQuantity * teamPart), // amount, if your deciamls is 8, send 10^8 for 1 token
  //     6, // decimals
  //     [],
  //     programId,
  //   ),
  // );

  // const currentTxs = JSON.parse(await redisClient.get("txs"));
  // await redisClient.set("txs", JSON.stringify([...(currentTxs || []), ...txs]));
  //
  // return txs;
};
