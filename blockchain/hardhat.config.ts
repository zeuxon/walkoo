import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "0x0000000000000000000000000000000000000000000000000000000000000001";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    amoy: {
      url: "https://polygon-amoy.g.alchemy.com/v2/lFb1AcHtYj1Ac8BoDVKgG",
      chainId: 80002,
      accounts: [DEPLOYER_KEY],
      gasPrice: 50_000_000_000,
      gas: 2_000_000,
    },
  },
};

export default config;
