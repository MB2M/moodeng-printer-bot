import {
  AccountLayout,
  getTransferFeeAmount,
  TOKEN_2022_PROGRAM_ID,
  unpackAccount,
} from "@solana/spl-token";

export const getTokenOwners = async (connection, mintAddress) => {
  console.log("Getting token owners");
  const tokenOwners = [];

  const allAccounts = await connection.getProgramAccounts(
    TOKEN_2022_PROGRAM_ID,
    {
      commitment: "confirmed",
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: mintAddress,
          },
        },
      ],
    },
  );

  for (const accountInfo of allAccounts) {
    const account = unpackAccount(
      accountInfo.pubkey,
      accountInfo.account,
      TOKEN_2022_PROGRAM_ID,
    );
    const owner = AccountLayout.decode(accountInfo.account.data).owner;
    const owned = AccountLayout.decode(accountInfo.account.data).amount;

    const transferFeeAmount = getTransferFeeAmount(account);

    tokenOwners.push({
      tokenAccountAddress: accountInfo.pubkey,
      amountOwned: owned,
      withheldAmount: transferFeeAmount.withheldAmount || BigInt(0),
      account: owner,
    });
  }
  return tokenOwners;
};
