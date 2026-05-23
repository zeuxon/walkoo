import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const address = signer.address;

  const confirmedNonce = await ethers.provider.getTransactionCount(address, "latest");
  const pendingNonce = await ethers.provider.getTransactionCount(address, "pending");

  console.log("Address:", address);
  console.log("Confirmed nonce:", confirmedNonce);
  console.log("Pending nonce:", pendingNonce);

  if (confirmedNonce === pendingNonce) {
    console.log("No pending transactions to cancel!");
    return;
  }

  console.log(`Cancelling ${pendingNonce - confirmedNonce} pending transaction(s)...`);

  for (let nonce = confirmedNonce; nonce < pendingNonce; nonce++) {
    console.log(`Cancelling nonce ${nonce}...`);
    const tx = await signer.sendTransaction({
      to: address,
      value: 0,
      nonce: nonce,
      gasLimit: 21000,
      gasPrice: 100_000_000_000,
    });
    await tx.wait();
    console.log(`  Nonce ${nonce} cancelled, tx: ${tx.hash}`);
  }

  const newBalance = await ethers.provider.getBalance(address);
  console.log("New balance:", ethers.formatEther(newBalance), "MATIC");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
