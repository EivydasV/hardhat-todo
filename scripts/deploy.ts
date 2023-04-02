import { ethers } from "hardhat";

async function main() {
  const Todo = await ethers.getContractFactory("Todo");
  const todo = await Todo.deploy(15);

  await todo.deployed();

  console.log("Todo deployed to:", todo.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
