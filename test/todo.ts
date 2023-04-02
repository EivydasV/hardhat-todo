import { expect } from "chai";
import { ethers } from "hardhat";
import { Todo } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Todo", function () {
  let contract: Todo;
  let owner: SignerWithAddress;
  let simpleUser: SignerWithAddress;

  const maxPerPage = 15;

  const errors = {
    onlyOwner: "Only owner can call this function",
    addressZero: "address cannot be zero address",
    noTodosFound: "No todos found",
    todoDoesNotExist: "Todo does not exist",
    startIndexLessThanEndIndex: "startIndex must be less than endIndex",
    endIndexLessThanTodoCount:
      "endIndex must be less than or equal to todoCount",
    maxItemsPerPage: `Max items per page is ${maxPerPage}`,
  } as const;

  beforeEach(async () => {
    const Todo = await ethers.getContractFactory("Todo");
    const todo = await Todo.deploy(maxPerPage);
    contract = await todo.deployed();
    [owner, simpleUser] = await ethers.getSigners();
  });

  it("owner should be deployer", async () => {
    expect(await contract.getOwner()).to.equal(owner.address);
  });

  it("should set new owner", async () => {
    await contract.setOwner(simpleUser.address);
    expect(await contract.getOwner()).to.equal(simpleUser.address);
  });

  it("set owner should revert if address is zero", async () => {
    const setOwner = contract.setOwner(ethers.constants.AddressZero);
    await expect(setOwner).to.be.revertedWith(errors.addressZero);
  });

  it("should set correct maxPerPage", async () => {
    expect(await contract.getMaxPerPage()).to.equal(maxPerPage);
  });

  it("should set new maxPerPage", async () => {
    const newMaxPerPage = 10;
    await contract.setMaxPerPage(newMaxPerPage);
    expect(await contract.getMaxPerPage()).to.equal(newMaxPerPage);
  });

  it("should revert if setMaxPerPage is called by non-owner", async () => {
    const setMaxPerPage = contract
      .connect(simpleUser)
      .setMaxPerPage(maxPerPage);
    await expect(setMaxPerPage).to.be.revertedWith(errors.onlyOwner);
  });

  it("should create new todo", async () => {
    const todo = "Buy milk";
    const addTodo = await contract.addTodo(todo);
    const createdTodo = await contract.getTodoById(0);

    expect(await contract.getTodoCount(owner.address)).to.equal(1);
    expect(createdTodo.text).to.equal(todo);

    await expect(addTodo)
      .to.emit(contract, "TodoAdded")
      .withArgs(owner.address, createdTodo);
  });

  it("should increment todo count", async () => {
    const todo = "Buy milk";
    await contract.addTodo(todo);
    expect(await contract.getTodoCount(owner.address)).to.equal(1);
  });

  it("should revert if getTodoCount is called by non-owner", async () => {
    const getTodoCount = contract
      .connect(simpleUser)
      .getTodoCount(owner.address);
    await expect(getTodoCount).to.be.revertedWith(errors.onlyOwner);
  });

  it("should get todo by id", async () => {
    const todo = "Buy milk";
    await contract.addTodo(todo);
    const createdTodo = await contract.getTodoById(0);
    expect(createdTodo.text).to.equal(todo);
  });

  it("should revert if startIndex must be less than endIndex", async () => {
    const getMyTodos = contract.getMyTodos(10, 1);
    await expect(getMyTodos).to.be.revertedWith(
      errors.startIndexLessThanEndIndex
    );
  });

  it("should revert if startIndex must be less than todo count", async () => {
    const getMyTodos = contract.getMyTodos(10, 11);
    await expect(getMyTodos).to.be.revertedWith(
      errors.endIndexLessThanTodoCount
    );
  });

  it("should revert if requested data is more than maxPerPage", async () => {
    const maxPerPage = await contract.getMaxPerPage();
    await contract.setTodoCount(owner.address, maxPerPage.add(1));
    const getMyTodos = contract.getMyTodos(0, maxPerPage.add(1));
    await expect(getMyTodos).to.be.revertedWith(errors.maxItemsPerPage);
  });

  it("should return paginated getMyTodos", async () => {
    const todo1 = "Buy milk";
    const todo2 = "Buy eggs";
    const todo3 = "Buy bread";
    await Promise.all([
      contract.addTodo(todo1),
      contract.addTodo(todo2),
      contract.addTodo(todo3),
    ]);

    const todos = await contract.getMyTodos(0, 3);
    expect(todos[1].toNumber()).to.equal(3);
    expect(todos[0][0].text).to.equal(todo1);
    expect(todos[0][1].text).to.equal(todo2);
    expect(todos[0][2].text).to.equal(todo3);
  });

  it("should revert if todo by id is not found", async () => {
    const getTodoById = contract.getTodoById(0);
    await expect(getTodoById).to.be.revertedWith(errors.noTodosFound);
  });

  it("should revert if getTodoByAddress is called by non-owner", async () => {
    const getTodoByAddress = contract
      .connect(simpleUser)
      .getTodoByAddress(0, 1, owner.address);
    await expect(getTodoByAddress).to.be.revertedWith(errors.onlyOwner);
  });

  it("should revert getTodoByAddress if startIndex must be less than endIndex", async () => {
    const getTodoByAddress = contract.getTodoByAddress(10, 1, owner.address);
    await expect(getTodoByAddress).to.be.revertedWith(
      errors.startIndexLessThanEndIndex
    );
  });

  it('should allow owner to call "getTodoByAddress"', async () => {
    await contract.addTodo("Buy milk");
    const getTodoByAddress = contract.getTodoByAddress(0, 1, owner.address);
    await expect(getTodoByAddress).to.not.be.reverted;
  });

  it("getTodoByAddress should return paginated todos", async () => {
    const todo1 = "Buy milk";
    const todo2 = "Buy eggs";
    const todo3 = "Buy bread";
    await Promise.all([
      contract.addTodo(todo1),
      contract.addTodo(todo2),
      contract.addTodo(todo3),
    ]);
    const todos = await contract.getTodoByAddress(0, 3, owner.address);
    expect(todos[1].toNumber()).to.equal(3);
    expect(todos[0][0].text).to.equal(todo1);
    expect(todos[0][1].text).to.equal(todo2);
    expect(todos[0][2].text).to.equal(todo3);
  });

  it("should revert if editTodo id is not found", async () => {
    const editTodo = contract.editTodo(0, "Buy milk", true);
    await expect(editTodo).to.be.revertedWith(errors.todoDoesNotExist);
  });

  it("should edit todo by id", async () => {
    const todo = "Buy milk";
    await contract.addTodo(todo);
    const editTodo = await contract.editTodo(0, "Buy eggs", true);
    const editedTodo = await contract.getTodoById(0);
    expect(editedTodo.text).to.equal("Buy eggs");
    expect(editedTodo.completed).to.equal(true);
    await expect(editTodo)
      .to.emit(contract, "TodoEdited")
      .withArgs(owner.address, editedTodo);
  });

  it("should revert if deleteTodo id is not found", async () => {
    const deleteTodo = contract.deleteTodoById(0);
    await expect(deleteTodo).to.be.revertedWith(errors.todoDoesNotExist);
  });

  it("should delete todo by id", async () => {
    const todo = "Buy milk";
    await contract.addTodo(todo);
    const findTodo = await contract.getTodoById(0);
    const deleteTodo = await contract.deleteTodoById(0);

    const deletedTodo = await contract.getTodoById(0);
    expect(deletedTodo.text).to.equal("");

    await expect(deleteTodo)
      .to.emit(contract, "TodoRemoved")
      .withArgs(owner.address, findTodo);
  });
});
