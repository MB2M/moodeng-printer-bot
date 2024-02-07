import { PublicKey } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  withdrawWithheldTokensFromAccounts,
  withdrawWithheldTokensFromMint,
} from "@solana/spl-token";
import { getTokenOwners } from "./getTokenOwners.js";

export const collectFees = async (
  connection,
  authority,
  payer,
  mintAddress,
  to,
) => {
  const accounts = await getTokenOwners(connection, mintAddress);

  const accountsToWithdrawFrom = accounts.filter(
    (acc) => acc.withheldAmount > BigInt(0),
  );

  if (accountsToWithdrawFrom.length > 0) {
    console.log(
      `Collecting ${accountsToWithdrawFrom.reduce((acc, account) => acc + account.withheldAmount, BigInt(0))} fees from ${accountsToWithdrawFrom.length} accounts`,
    );

    // WITHDRAW WITHHELD TOKENS
    const withdrawTokensSig = await withdrawWithheldTokensFromAccounts(
      connection, // connection to use
      payer, // payer of the transaction fee
      new PublicKey(mintAddress), // the token mint
      to.address, // the destination account
      authority, // the withdraw withheld token authority
      [], // signing accounts
      accountsToWithdrawFrom.map((acc) => acc.tokenAccountAddress), // source accounts from which to withdraw withheld fees
      undefined, // options for confirming the transaction
      TOKEN_2022_PROGRAM_ID, // SPL token program id
    );
    console.log(
      "Token withdraw withheld fees",
      `https://solana.fm/tx/${withdrawTokensSig}`,
    );
  } else {
    console.log("No fees to collect from accounts");
  }

  let mintFeesOwned = 0;

  try {
    const resp = await fetch(
      "https://solana-mainnet.core.chainstack.com/5467e70ce05926c87e1fbbaca5b91e4b",
      {
        method: "POST",
        body: `{"jsonrpc": "2.0","id": "5467e70ce05926c87e1fbbaca5b91e4b","method": "getAccountInfo","params": ["${mintAddress}",{"encoding": "jsonParsed"}]}`,
      },
    );
    const json = await resp.json();

    mintFeesOwned = json.result.value.data.parsed.info.extensions.find(
      (ext) => ext.extension === "transferFeeConfig",
    ).state.withheldAmount;
  } catch (err) {
    console.log(err);
  }

  if (mintFeesOwned) {
    console.log(`Collecting ${mintFeesOwned} fees from mint account`);
    const fff = await withdrawWithheldTokensFromMint(
      connection,
      payer,
      new PublicKey(mintAddress),
      to.address,
      authority,
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    console.log("Token withdraw withheld fees", `https://solana.fm/tx/${fff}`);
  } else {
    console.log("No fees to collect from mint account");
  }
};
