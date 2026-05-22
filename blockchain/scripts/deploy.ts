import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying WalkooLedger with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MATIC");

  const WalkooLedger = await ethers.getContractFactory("WalkooLedger");

  console.log("Sending deploy transaction...");
  const contract = await WalkooLedger.deploy();

  // Print the tx hash immediately so we can track it
  const tx = contract.deploymentTransaction();
  if (tx) {
    console.log("Transaction hash:", tx.hash);
    console.log("Check it: https://amoy.polygonscan.com/tx/" + tx.hash);
    console.log("Waiting for confirmation...");
  }

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("");
  console.log("SUCCESS! WalkooLedger deployed to:", address);
  console.log("View on explorer: https://amoy.polygonscan.com/address/" + address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
