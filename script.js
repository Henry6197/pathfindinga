const TERRAIN_SEQUENCE = ["normal", "start", "end", "rock"];

const TERRAIN_CONFIG = {
	normal: {
		label: "Normal",
		cost: 1,
		passable: true,
		fill: "rgba(255, 255, 255, 0.02)"
	},
	rock: {
		label: "Rock",
		cost: Infinity,
		passable: false,
		fill: "rgba(153, 164, 173, 0.92)"
	},
	start: {
		label: "Start",
		cost: 1,
		passable: true,
		fill: "rgba(53, 173, 88, 0.92)"
	},
	end: {
		label: "End",
		cost: 1,
		passable: true,
		fill: "rgba(214, 71, 67, 0.92)"
	}
};

class Cell {
	constructor(row, col, type = "normal") {
		this.row = row;
		this.col = col;
		this.setType(type);
		this.resetSolverData();
	}

	setType(newType) {
		const terrain = TERRAIN_CONFIG[newType];
		this.type = newType;
		this.cost = terrain.cost;
		this.passable = terrain.passable;
		this.fill = terrain.fill;
	}

	cycleType() {
		const currentIndex = TERRAIN_SEQUENCE.indexOf(this.type);
		const nextIndex = (currentIndex + 1) % TERRAIN_SEQUENCE.length;
		return TERRAIN_SEQUENCE[nextIndex];
	}

	resetSolverData() {
		this.distance = Infinity;
		this.parent = null;
	}
}

class Grid {
	constructor(canvas) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		this.sandRect = {
			x: 70,
			y: 84,
			width: 560,
			height: 300
		};
		this.cellSize = 32;
		this.cells = [];
		this.rows = 0;
		this.cols = 0;
		this.startCell = null;
		this.endCell = null;
		this.path = [];
		this.initialize();
	}

	initialize() {
		this.cols = Math.max(2, Math.floor(this.sandRect.width / this.cellSize));
		this.rows = Math.max(2, Math.floor(this.sandRect.height / this.cellSize));
		this.cells = [];
		this.startCell = null;
		this.endCell = null;
		this.path = [];

		for (let row = 0; row < this.rows; row += 1) {
			const currentRow = [];

			for (let col = 0; col < this.cols; col += 1) {
				currentRow.push(new Cell(row, col));
			}

			this.cells.push(currentRow);
		}
	}

	setCellSize(nextSize) {
		this.cellSize = nextSize;
		this.initialize();
	}

	getCell(row, col) {
		if (row < 0 || col < 0 || row >= this.rows || col >= this.cols) {
			return null;
		}

		return this.cells[row][col];
	}

	getCellFromPixel(x, y) {
		const withinX = x >= this.sandRect.x && x <= this.sandRect.x + this.cols * this.cellSize;
		const withinY = y >= this.sandRect.y && y <= this.sandRect.y + this.rows * this.cellSize;

		if (!withinX || !withinY) {
			return null;
		}

		const col = Math.floor((x - this.sandRect.x) / this.cellSize);
		const row = Math.floor((y - this.sandRect.y) / this.cellSize);
		return this.getCell(row, col);
	}

	resetSolverData() {
		for (const row of this.cells) {
			for (const cell of row) {
				cell.resetSolverData();
			}
		}
	}

	clearPathOnly() {
		this.path = [];
		this.resetSolverData();
	}

	resetAll() {
		this.initialize();
	}

	applyType(cell, nextType) {
		if (!cell) {
			return;
		}

		if (cell === this.startCell) this.startCell = null;
		if (cell === this.endCell) this.endCell = null;

		if (nextType === "start") {
			if (this.startCell) this.startCell.setType("normal");
			this.startCell = cell;
		}

		if (nextType === "end") {
			if (this.endCell) this.endCell.setType("normal");
			this.endCell = cell;
		}

		cell.setType(nextType);
		this.clearPathOnly();
	}

	cycleCell(cell) {
		const nextType = cell.cycleType();
		this.applyType(cell, nextType);
	}

	getNeighbors(cell) {
		const deltas = [
			[-1, 0],
			[1, 0],
			[0, -1],
			[0, 1]
		];

		return deltas
			.map(([rowOffset, colOffset]) => this.getCell(cell.row + rowOffset, cell.col + colOffset))
			.filter(Boolean);
	}

	render() {
		const { ctx, canvas } = this;
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		this.drawGridBackdrop();
		this.drawCells();
		this.drawPath();
		this.drawGridLines();
	}

	drawGridBackdrop() {
		const { ctx } = this;
		ctx.save();
		ctx.fillStyle = "rgba(255, 236, 173, 0.22)";
		ctx.fillRect(this.sandRect.x, this.sandRect.y, this.cols * this.cellSize, this.rows * this.cellSize);
		ctx.restore();
	}

	drawCells() {
		const { ctx } = this;

		for (const row of this.cells) {
			for (const cell of row) {
				const x = this.sandRect.x + cell.col * this.cellSize;
				const y = this.sandRect.y + cell.row * this.cellSize;

				if (cell.type !== "normal") {
					this.drawCellFill(cell, x, y);
				}
			}
		}
	}

	drawCellFill(cell, x, y) {
		const { ctx } = this;

		ctx.save();
		ctx.fillStyle = cell.fill;
		ctx.fillRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);

		ctx.restore();
	}

	drawPath() {
		if (!this.path.length) {
			return;
		}

		const { ctx } = this;
		ctx.save();

		for (const cell of this.path) {
			const x = this.sandRect.x + cell.col * this.cellSize;
			const y = this.sandRect.y + cell.row * this.cellSize;
			ctx.fillStyle = "purple";
			ctx.fillRect(x + 2, y + 2, Math.max(1, this.cellSize - 4), Math.max(1, this.cellSize - 4));
		}
		ctx.restore();
	}

	drawGridLines() {
		const { ctx } = this;
		ctx.save();
		ctx.strokeStyle = "rgba(91, 57, 34, 0.24)";
		ctx.lineWidth = 1;

		for (let row = 0; row <= this.rows; row += 1) {
			const y = this.sandRect.y + row * this.cellSize;
			ctx.beginPath();
			ctx.moveTo(this.sandRect.x, y);
			ctx.lineTo(this.sandRect.x + this.cols * this.cellSize, y);
			ctx.stroke();
		}

		for (let col = 0; col <= this.cols; col += 1) {
			const x = this.sandRect.x + col * this.cellSize;
			ctx.beginPath();
			ctx.moveTo(x, this.sandRect.y);
			ctx.lineTo(x, this.sandRect.y + this.rows * this.cellSize);
			ctx.stroke();
		}

		ctx.restore();
	}
}

class Pathfinder {
	constructor(grid) {
		this.grid = grid;
	}

	popCheapest(openSet) {
		let cheapestIndex = 0;

		for (let i = 1; i < openSet.length; i += 1) {
			if (openSet[i].distance < openSet[cheapestIndex].distance) {
				cheapestIndex = i;
			}
		}

		return openSet.splice(cheapestIndex, 1)[0];
	}

	reconstructPath(endCell) {
		const path = [];
		let current = endCell;

		while (current) {
			path.push(current);
			current = current.parent;
		}

		return path.reverse();
	}

	createPath() {
		const { startCell, endCell } = this.grid;

		if (!startCell || !endCell) {
			return { success: false, message: "path error" };
		}

		this.grid.resetSolverData();
		const openSet = [startCell];
		const closedSet = new Set();

		startCell.distance = 0;

		while (openSet.length) {
			const current = this.popCheapest(openSet);

			if (current === endCell) {
				const path = this.reconstructPath(endCell);
				const totalCost = path.slice(1).reduce((sum, cell) => sum + cell.cost, 0);
				return { success: true, path, totalCost };
			}

			closedSet.add(current);

			for (const neighbor of this.grid.getNeighbors(current)) {
				if (!neighbor.passable || closedSet.has(neighbor)) {
					continue;
				}

				const nextDistance = current.distance + neighbor.cost;
				const isBetterPath = nextDistance < neighbor.distance;

				if (!openSet.includes(neighbor)) {
					openSet.push(neighbor);
				} else if (!isBetterPath) {
					continue;
				}

				neighbor.parent = current;
				neighbor.distance = nextDistance;
			}
		}

		return { success: false, message: "path error" };
	}
}

function updateStatus(message, details = "") {
	document.getElementById("statusMessage").textContent = details ? `${message} ${details}` : message;
}

function pointerToCanvas(canvas, event) {
	const bounds = canvas.getBoundingClientRect();
	const scaleX = canvas.width / bounds.width;
	const scaleY = canvas.height / bounds.height;

	return {
		x: (event.clientX - bounds.left) * scaleX,
		y: (event.clientY - bounds.top) * scaleY
	};
}

function initializeApp() {
	const canvas = document.getElementById("sandboxCanvas");
	const gridSizeInput = document.getElementById("gridSizeInput");
	const applyGridSizeButton = document.getElementById("applyGridSizeButton");
	const findPathButton = document.getElementById("findPathButton");
	const resetGridButton = document.getElementById("resetGridButton");
	const grid = new Grid(canvas);
	gridSizeInput.value = String(grid.cellSize);
	const pathfinder = new Pathfinder(grid);

	grid.render();

	canvas.addEventListener("click", (event) => {
		const { x, y } = pointerToCanvas(canvas, event);
		const cell = grid.getCellFromPixel(x, y);

		if (!cell) {
			updateStatus("grid error");
			return;
		}

		grid.cycleCell(cell);
		grid.render();

		const terrainName = TERRAIN_CONFIG[cell.type].label;
		updateStatus(`Cell ${cell.row + 1}, ${cell.col + 1} is now ${terrainName}.`);
	});

	function applyGridSize() {
		const rawValue = Number(gridSizeInput.value);

		if (!Number.isFinite(rawValue) || rawValue <= 0) {
			updateStatus("grid size error");
			return;
		}

		const nextSize = Math.max(1, Math.round(rawValue));
		grid.setCellSize(nextSize);
		grid.render();
		updateStatus(`Grid cell size set to ${nextSize}.`);
	}

	applyGridSizeButton.addEventListener("click", applyGridSize);

	gridSizeInput.addEventListener("keydown", (event) => {
		if (event.key === "Enter") {
			applyGridSize();
		}
	});

	findPathButton.addEventListener("click", () => {
		const result = pathfinder.createPath();

		if (!result.success) {
			grid.path = [];
			grid.render();
			updateStatus(result.message);
			return;
		}

		grid.path = result.path;
		grid.render();
		updateStatus(`Path found across ${result.path.length} cells with total cost ${result.totalCost}.`);
	});

	resetGridButton.addEventListener("click", () => {
		grid.resetAll();
		grid.render();
		updateStatus("Grid reset.");
	});
}

initializeApp();