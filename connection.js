import { Connection } from "@solana/web3.js";

const HTTP_URL =
  // "https://solana-mainnet.g.alchemy.com/v2/jI17kkg_Fstlf3IDE_hY0H1khr8t44qw";
  "https://solana-mainnet.core.chainstack.com/5467e70ce05926c87e1fbbaca5b91e4b";
const WS_URL =
  // "wss://solana-mainnet.g.alchemy.com/v2/jI17kkg_Fstlf3IDE_hY0H1khr8t44qw";
  "wss://solana-mainnet.core.chainstack.com/ws/5467e70ce05926c87e1fbbaca5b91e4b";
export const connection = new Connection(HTTP_URL, {
  wsEndpoint: WS_URL,
  commitment: "confirmed",
});
