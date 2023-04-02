//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/utils/Strings.sol";

contract Todo {
    address private owner;
    uint128 private maxItemsPerPage;

    mapping(address => mapping(uint => TodoItem)) private _todos;
    mapping(address => uint) private _todoCount;

    struct TodoItem {
        string text;
        bool completed;
    }

    event TodoAdded(address indexed user, TodoItem todoItem);
    event TodoEdited(address indexed user, TodoItem todoItem);
    event TodoRemoved(address indexed user, TodoItem todoItem);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier mustHaveTodo(address user) {
        require(_todoCount[user] > 0, "No todos found");
        _;
    }

    modifier mustHaveTodoById(address user, uint id) {
        require(bytes(_todos[user][id].text).length > 0, "Todo does not exist");
        _;
    }

    modifier indexInBound(uint startIndex, uint endIndex) {
        require(startIndex < endIndex, "startIndex must be less than endIndex");
        require(
            endIndex <= _todoCount[msg.sender],
            "endIndex must be less than or equal to todoCount"
        );

        uint getDiffSum = endIndex - startIndex;

        require(
            getDiffSum <= maxItemsPerPage,
            string.concat(
                "Max items per page is ",
                Strings.toString(maxItemsPerPage)
            )
        );

        _;
    }

    constructor(uint128 paxPerPage) {
        maxItemsPerPage = paxPerPage;
        owner = msg.sender;
    }

    function setMaxPerPage(uint128 maxPerPage) public onlyOwner {
        maxItemsPerPage = maxPerPage;
    }

    function getMaxPerPage() public view returns (uint128) {
        return maxItemsPerPage;
    }

    function setTodoCount(address user, uint count) public onlyOwner {
        _todoCount[user] = count;
    }

    function getOwner() public view returns (address) {
        return owner;
    }

    function setOwner(address newOwner) public onlyOwner {
        require(newOwner != address(0), "address cannot be zero address");
        owner = newOwner;
    }

    function getTodoCount(address user) public view onlyOwner returns (uint) {
        return _todoCount[user];
    }

    function getTodoById(
        uint id
    ) public view mustHaveTodo(msg.sender) returns (TodoItem memory) {
        return _todos[msg.sender][id];
    }

    function getMyTodos(
        uint startIndex,
        uint endIndex
    )
        public
        view
        indexInBound(startIndex, endIndex)
        returns (TodoItem[] memory, uint)
    {
        return getPaginatedTodos(startIndex, endIndex, msg.sender);
    }

    function getTodoByAddress(
        uint startIndex,
        uint endIndex,
        address user
    )
        public
        view
        onlyOwner
        indexInBound(startIndex, endIndex)
        returns (TodoItem[] memory, uint)
    {
        return getPaginatedTodos(startIndex, endIndex, user);
    }

    function addTodo(string memory text) public {
        TodoItem memory todoItem = TodoItem({text: text, completed: false});

        _todos[msg.sender][_todoCount[msg.sender]++] = todoItem;

        emit TodoAdded(msg.sender, todoItem);
    }

    function editTodo(
        uint id,
        string memory text,
        bool completed
    ) public mustHaveTodoById(msg.sender, id) {
        _todos[msg.sender][id].text = text;
        _todos[msg.sender][id].completed = completed;

        emit TodoEdited(msg.sender, _todos[msg.sender][id]);
    }

    function deleteTodoById(uint id) public mustHaveTodoById(msg.sender, id) {
        TodoItem memory todoItem = _todos[msg.sender][id];

        delete _todos[msg.sender][id];

        emit TodoRemoved(msg.sender, todoItem);
    }

    function getPaginatedTodos(
        uint startIndex,
        uint endIndex,
        address sender
    ) private view returns (TodoItem[] memory, uint) {
        TodoItem[] memory todos = new TodoItem[](endIndex - startIndex);
        for (uint i = startIndex; i < endIndex; i++) {
            todos[i] = _todos[sender][i];
        }

        return (todos, _todoCount[sender]);
    }
}
