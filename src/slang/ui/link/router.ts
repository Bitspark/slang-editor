import {dia, g, routers, util as jointUtil} from "jointjs";

const util = jointUtil as any;

const joint = {
	routers,
	util: jointUtil as any,
};

const sqrt2 = Math.sqrt(2);

const degrees45 = 45;
const degrees90 = 90;
const degrees135 = 135;
const degrees180 = 180;
const degrees360 = 360;

const config = {
	maxAllowedDirectionChange: degrees135,

	diagonalCost() {
		return sqrt2 * this.step;
	},

	directions() {
		const step = this.step;
		const cost = this.cost();
		const diagonalCost = this.diagonalCost();

		return [
			{cost, offsetX: step, offsetY: 0},
			{cost: diagonalCost, offsetX: step, offsetY: step},
			{cost, offsetX: 0, offsetY: step},
			{cost: diagonalCost, offsetX: -step, offsetY: step},
			{cost, offsetX: -step, offsetY: 0},
			{cost: diagonalCost, offsetX: -step, offsetY: -step},
			{cost, offsetX: 0, offsetY: -step},
			{cost: diagonalCost, offsetX: step, offsetY: -step},
		];
	},

	fallbackRoute(from: any, to: any, opt: any) {
		// Find a route which breaks by 45 degrees ignoring all obstacles.

		const theta = from.theta(to);

		const route = [];

		let a = {x: to.x, y: from.y};
		let b = {x: from.x, y: to.y};

		if (theta % degrees180 > degrees90) {
			const t = a;
			a = b;
			b = t;
		}

		const p1 = (theta % degrees90) < degrees45 ? a : b;
		const l1 = new g.Line(from, p1);

		const alpha = degrees90 * Math.ceil(theta / degrees90);

		const p2 = g.Point.fromPolar(l1.squaredLength(), g.toRad(alpha + degrees135), p1);
		const l2 = new g.Line(to, p2);

		const intersectionPoint = (l1 as any).intersection(l2);
		const point = intersectionPoint ? intersectionPoint : to;

		const directionFrom = intersectionPoint ? point : from;

		const quadrant = degrees360 / opt.directions.length;
		const angleTheta = directionFrom.theta(to);
		const normalizedAngle = g.normalizeAngle(angleTheta + (quadrant / 2));
		const directionAngle = quadrant * Math.floor(normalizedAngle / quadrant);

		opt.previousDirectionAngle = directionAngle;

		if (point) { route.push(point.round()); }
		route.push(to);

		return route;
	},

	// size of the step to find a route (the grid of the manhattan pathfinder)
	step: 10,

	// the number of route finding loops that cause the router to abort
	// returns fallback route instead
	maximumLoops: 1000,

	// the number of decimal places to round floating point coordinates
	precision: 10,

	// should the router use perpendicular linkView option?
	// does not connect anchor of element but rather a point close-by that is orthogonal
	// this looks much better
	perpendicular: true,

	// should the source and/or target not be considered as obstacles?
	excludeEnds: [], // 'source', 'target'

	// should certain types of elements not be considered as obstacles?
	excludeTypes: ["basic.Text"],

	// possible starting directions from an element
	startDirections: ["top", "right", "bottom", "left"],

	// possible ending directions to an element
	endDirections: ["top", "right", "bottom", "left"],

	// specify the directions used above and what they mean
	directionMap: {
		top: {x: 0, y: -1},
		right: {x: 1, y: 0},
		bottom: {x: 0, y: 1},
		left: {x: -1, y: 0},
	},

	// cost of an orthogonal step
	cost() {

		return this.step;
	},

	// a penalty received for direction change
	penalties() {

		return {
			0: 0,
			45: this.step / 2,
			90: this.step / 2,
		};
	},

	// padding applied on the element bounding boxes
	paddingBox(): g.Rect {
		const step = this.step * 2;
		return new g.Rect(
			-step,
			-step,
			2 * step,
			2 * step,
		);
	},

	// a router to use when the manhattan router fails
	// (one of the partial routes returns null)
	fallbackRouter(vertices: g.Point[], opt: any, linkView: dia.LinkView): g.PlainPoint[] {
		if (!util.isFunction(joint.routers.orthogonal)) {
			throw new Error("Manhattan requires the orthogonal router as default fallback.");
		}

		return joint.routers.orthogonal(vertices, util.assign({}, config, opt), linkView);
	},

	// if a function is provided, it's used to route the link while dragging an end
	// i.e. function(from, to, opt) { return []; }
	draggingRoute: null,
};

// HELPER CLASSES //

// Map of obstacles
// Helper structure to identify whether a point lies inside an obstacle.
class ObstacleMap {

	public map: any = {};
	// tells how to divide the paper when creating the elements map
	public mapGridSize = 200;
	public options: any;

	constructor(public opt: any) {
		this.options = opt;
	}

	public build(graph: any, link: any) {

		const opt = this.options;

		// source or target element could be excluded from set of obstacles
		const excludedEnds = util.toArray(opt.excludeEnds).reduce(function(res: any, item: any) {

			const end = link.get(item);
			if (end) {
				const cell = graph.getCell(end.id);
				if (cell) {
					res.push(cell);
				}
			}

			return res;
		}, []);

		// Exclude any embedded elements from the source and the target element.
		let excludedAncestors: any = [];

		const source = graph.getCell(link.get("source").id);
		if (source) {
			excludedAncestors = util.union(excludedAncestors, source.getAncestors().map(function(cell: dia.Cell) {
				return cell.id;
			}));
		}

		const target = graph.getCell(link.get("target").id);
		if (target) {
			excludedAncestors = util.union(excludedAncestors, target.getAncestors().map(function(cell: dia.Cell) {
				return cell.id;
			}));
		}

		const mapGridSize = this.mapGridSize;

		graph.getElements().reduce(function(map: any, element: any) {
			const isExcludedType = util.toArray(opt.excludeTypes).includes(element.get("type"));
			const isExcludedEnd = excludedEnds.find(function(excluded: any) {
				return excluded.id === element.id;
			});
			const isExcludedAncestor = excludedAncestors.includes(element.id);
			const isExcludedExplicitly = element.get("obstacle") === false;

			const isExcluded = isExcludedType || isExcludedEnd || isExcludedAncestor || isExcludedExplicitly;
			if (!isExcluded) {
				const bbox = element.getBBox().moveAndExpand(opt.paddingBox);

				const origin = bbox.origin().snapToGrid(mapGridSize);
				const corner = bbox.corner().snapToGrid(mapGridSize);

				for (let x = origin.x; x <= corner.x; x += mapGridSize) {
					for (let y = origin.y; y <= corner.y; y += mapGridSize) {
						const gridKey = x + "@" + y;
						map[gridKey] = map[gridKey] || [];
						map[gridKey].push(bbox);
					}
				}
			}

			return map;
		}, this.map);

		return this;
	}

	public isPointAccessible(point: any) {
		const mapKey = point.clone().snapToGrid(this.mapGridSize).toString();
		return util.toArray(this.map[mapKey]).every(function(obstacle: any) {
			return !obstacle.containsPoint(point);
		});
	}
}

// Sorted Set
// Set of items sorted by given value.
class SortedSet {
	public items: any;
	public hash: any;
	public values: any;
	public OPEN: any;
	public CLOSE: any;

	constructor() {
		this.items = [];
		this.hash = {};
		this.values = {};
		this.OPEN = 1;
		this.CLOSE = 2;
	}

	public add(item: any, value: any) {
		if (this.hash[item]) {
			// item removal
			this.items.splice(this.items.indexOf(item), 1);
		} else {
			this.hash[item] = this.OPEN;
		}

		this.values[item] = value;

		const index = joint.util.sortedIndex(this.items, item, function(this: any, i: number) {
			return this.values[i];
		}.bind(this));

		this.items.splice(index, 0, item);
	}

	public remove(item: any) {
		this.hash[item] = this.CLOSE;
	}

	public isOpen(item: any) {
		return this.hash[item] === this.OPEN;
	}

	public isClose(item: any) {
		return this.hash[item] === this.CLOSE;
	}

	public isEmpty() {
		return this.items.length === 0;
	}

	public pop() {
		const item = this.items.shift();
		this.remove(item);
		return item;
	}
}

// HELPERS //

// return source bbox
function getSourceBBox(linkView: any, opt: any) {

	// expand by padding box
	if (opt && opt.paddingBox) { return linkView.sourceBBox.clone().moveAndExpand(opt.paddingBox); }

	return linkView.sourceBBox.clone();
}

// return target bbox
function getTargetBBox(linkView: any, opt: any) {

	// expand by padding box
	if (opt && opt.paddingBox) { return linkView.targetBBox.clone().moveAndExpand(opt.paddingBox); }

	return linkView.targetBBox.clone();
}

// return source anchor
function getSourceAnchor(linkView: any, opt: any) {

	if (linkView.sourceAnchor) { return linkView.sourceAnchor; }

	// fallback: center of bbox
	const sourceBBox = getSourceBBox(linkView, opt);
	return sourceBBox.center();
}

// return target anchor
function getTargetAnchor(linkView: any, opt: any) {

	if (linkView.targetAnchor) { return linkView.targetAnchor; }

	// fallback: center of bbox
	const targetBBox = getTargetBBox(linkView, opt);
	return targetBBox.center(); // default
}

// returns a direction index from start point to end point
// corrects for grid deformation between start and end
function getDirectionAngle(start: any, end: any, numDirections: any, grid: any, opt: any) {

	const quadrant = degrees360 / numDirections;
	const angleTheta = start.theta(fixAngleEnd(start, end, grid, opt));
	const normalizedAngle = g.normalizeAngle(angleTheta + (quadrant / 2));
	return quadrant * Math.floor(normalizedAngle / quadrant);
}

// helper function for getDirectionAngle()
// corrects for grid deformation
// (if a point is one grid steps away from another in both dimensions,
// it is considered to be 45 degrees away, even if the real angle is different)
// this causes visible angle discrepancies if `opt.step` is much larger than `paper.gridSize`
function fixAngleEnd(start: any, end: any, grid: any, opt: any) {

	const step = opt.step;

	const diffX = end.x - start.x;
	const diffY = end.y - start.y;

	const gridStepsX = diffX / grid.x;
	const gridStepsY = diffY / grid.y;

	const distanceX = gridStepsX * step;
	const distanceY = gridStepsY * step;

	return new g.Point(start.x + distanceX, start.y + distanceY);
}

// return the change in direction between two direction angles
function getDirectionChange(angle1: any, angle2: any) {

	const directionChange = Math.abs(angle1 - angle2);
	return (directionChange > degrees180) ? (degrees360 - directionChange) : directionChange;
}

// fix direction offsets according to current grid
// @ts-ignore
function getGridOffsets(directions: any, grid: any, opt: any) {

	const step = opt.step;

	util.toArray(opt.directions).forEach(function(direction: any) {

		direction.gridOffsetX = (direction.offsetX / step) * grid.x;
		direction.gridOffsetY = (direction.offsetY / step) * grid.y;
	});
}

// get grid size in x and y dimensions, adapted to source and target positions
function getGrid(step: any, source: any, target: any) {

	return {
		source: source.clone(),
		x: getGridDimension(target.x - source.x, step),
		y: getGridDimension(target.y - source.y, step),
	};
}

// helper function for getGrid()
function getGridDimension(diff: any, step: any) {

	// return step if diff = 0
	if (!diff) { return step; }

	const absDiff = Math.abs(diff);
	const numSteps = Math.round(absDiff / step);

	// return absDiff if less than one step apart
	if (!numSteps) { return absDiff; }

	// otherwise, return corrected step
	const roundedDiff = numSteps * step;
	const remainder = absDiff - roundedDiff;
	const stepCorrection = remainder / numSteps;

	return step + stepCorrection;
}

// return a clone of point snapped to grid
function snapToGrid(point: any, grid: any) {

	const source = grid.source;

	const snappedX = g.snapToGrid(point.x - source.x, grid.x) + source.x;
	const snappedY = g.snapToGrid(point.y - source.y, grid.y) + source.y;

	return new g.Point(snappedX, snappedY);
}

// round the point to opt.precision
function round(point: any, opt: any) {

	if (!point) { return point; }

	return point.round(opt.precision);
}

// return a string representing the point
// string is rounded to nearest int in both dimensions
function getKey(point: any) {

	return point.clone().round().toString();
}

// return a normalized vector from given point
// used to determine the direction of a difference of two points
function normalizePoint(point: any) {

	return new g.Point(
		point.x === 0 ? 0 : Math.abs(point.x) / point.x,
		point.y === 0 ? 0 : Math.abs(point.y) / point.y,
	);
}

// PATHFINDING //

// reconstructs a route by concatenating points with their parents
function reconstructRoute(parents: any, points: any, tailPoint: any, from: any, to: any, opt: any) {

	const route = [];

	let prevDiff = normalizePoint(to.difference(tailPoint));

	let currentKey = getKey(tailPoint);
	let parent = parents[currentKey];

	let point;
	while (parent) {

		point = round(points[currentKey], opt);

		const diff = normalizePoint(point.difference(round(parent.clone(), opt)));
		if (!diff.equals(prevDiff)) {
			route.unshift(point);
			prevDiff = diff;
		}

		currentKey = getKey(parent);
		parent = parents[currentKey];
	}

	const leadPoint = round(points[currentKey], opt);

	const fromDiff = normalizePoint(leadPoint.difference(from));
	if (!fromDiff.equals(prevDiff)) {
		route.unshift(leadPoint);
	}

	return route;
}

// heuristic method to determine the distance between two points
function estimateCost(from: any, endPoints: any) {

	let min = Infinity;

	for (let i = 0, len = endPoints.length; i < len; i++) {
		const cost = from.manhattanDistance(endPoints[i]);
		if (cost < min) { min = cost; }
	}

	return min;
}

// find points around the bbox taking given directions into account
// lines are drawn from anchor in given directions, intersections recorded
// if anchor is outside bbox, only those directions that intersect get a rect point
// the anchor itself is returned as rect point (representing some directions)
// (since those directions are unobstructed by the bbox)
function getRectPoints(anchor: any, bbox: any, directionList: any, grid: any, opt: any) {

	const directionMap = opt.directionMap;

	const snappedAnchor = round(snapToGrid(anchor, grid), opt);
	const snappedCenter = round(snapToGrid(bbox.center(), grid), opt);
	const anchorCenterVector = snappedAnchor.difference(snappedCenter);

	const keys = util.isObject(directionMap) ? Object.keys(directionMap) : [];
	const dirList = util.toArray(directionList);
	const rectPoints = keys.reduce(function(res: any, key: any) {

		if (dirList.includes(key)) {
			const direction = directionMap[key];

			// create a line that is guaranteed to intersect the bbox if bbox is in the direction
			// even if anchor lies outside of bbox
			const endpoint = new g.Point(
				snappedAnchor.x + direction.x * (Math.abs(anchorCenterVector.x) + bbox.width),
				snappedAnchor.y + direction.y * (Math.abs(anchorCenterVector.y) + bbox.height),
			);
			const intersectionLine = new g.Line(anchor, endpoint);

			// get the farther intersection, in case there are two
			// (that happens if anchor lies next to bbox)
			const intersections: any = intersectionLine.intersect(bbox) || [];
			const numIntersections = intersections.length;
			let farthestIntersectionDistance;
			let farthestIntersection = null;
			for (let i = 0; i < numIntersections; i++) {
				const currentIntersection = intersections[i];
				const distance = snappedAnchor.squaredDistance(currentIntersection);
				if (farthestIntersectionDistance === undefined || (distance > farthestIntersectionDistance)) {
					farthestIntersectionDistance = distance;
					farthestIntersection = snapToGrid(currentIntersection, grid);
				}
			}
			const point = round(farthestIntersection, opt);

			// if an intersection was found in this direction, it is our rectPoint
			if (point) {
				// if the rectPoint lies inside the bbox, offset it by one more step
				if (bbox.containsPoint(point)) {
					round(point.offset(direction.x * grid.x, direction.y * grid.y), opt);
				}

				// then add the point to the result array
				res.push(point);
			}
		}

		return res;
	}, []);

	// if anchor lies outside of bbox, add it to the array of points
	if (!bbox.containsPoint(snappedAnchor)) { rectPoints.push(snappedAnchor); }

	return rectPoints;
}

// finds the route between two points/rectangles (`from`, `to`) implementing A* algorithm
// rectangles get rect points assigned by getRectPoints()
function findRoute(this: any, from: any, to: any, map: any, opt: any) {

	// Get grid for this route.

	let sourceAnchor, targetAnchor;

	if (from instanceof g.Rect) { // `from` is sourceBBox
		sourceAnchor = getSourceAnchor(this, opt).clone();
	} else {
		sourceAnchor = from.clone();
	}

	if (to instanceof g.Rect) { // `to` is targetBBox
		targetAnchor = getTargetAnchor(this, opt).clone();
	} else {
		targetAnchor = to.clone();
	}

	const grid = getGrid(opt.step, sourceAnchor, targetAnchor);

	// Get pathfinding points.

	let start, end;
	let startPoints, endPoints;

	// set of points we start pathfinding from
	if (from instanceof g.Rect) { // `from` is sourceBBox
		start = round(snapToGrid(sourceAnchor, grid), opt);
		startPoints = getRectPoints(start, from, opt.startDirections, grid, opt);

	} else {
		start = round(snapToGrid(sourceAnchor, grid), opt);
		startPoints = [start];
	}

	// set of points we want the pathfinding to finish at
	if (to instanceof g.Rect) { // `to` is targetBBox
		end = round(snapToGrid(targetAnchor, grid), opt);
		endPoints = getRectPoints(targetAnchor, to, opt.endDirections, grid, opt);

	} else {
		end = round(snapToGrid(targetAnchor, grid), opt);
		endPoints = [end];
	}

	// take into account only accessible rect points (those not under obstacles)
	startPoints = startPoints.filter(map.isPointAccessible, map);
	endPoints = endPoints.filter(map.isPointAccessible, map);

	// Check that there is an accessible route point on both sides.
	// Otherwise, use fallbackRoute().
	if (startPoints.length > 0 && endPoints.length > 0) {

		// The set of tentative points to be evaluated, initially containing the start points.
		// Rounded to nearest integer for simplicity.
		const openSet = new SortedSet();
		// Keeps reference to actual points for given elements of the open set.
		const points: any = {};
		// Keeps reference to a point that is immediate predecessor of given element.
		const parents: any = {};
		// Cost from start to a point along best known path.
		const costs: any = {};

		for (let i = 0, n = startPoints.length; i < n; i++) {
			const point = startPoints[i];

			const key = getKey(point);
			openSet.add(key, estimateCost(point, endPoints));
			points[key] = point;
			costs[key] = 0;
		}

		const previousRouteDirectionAngle = opt.previousDirectionAngle; // undefined for first route
		const isPathBeginning = (previousRouteDirectionAngle === undefined);

		// directions
		let direction, directionChange;
		const directions = opt.directions;
		getGridOffsets(directions, grid, opt);

		const numDirections = directions.length;

		const endPointsKeys = util.toArray(endPoints).reduce(function(res: any, endPoint: any) {

			const key = getKey(endPoint);
			res.push(key);
			return res;
		}, []);

		// main route finding loop
		let loopsRemaining = opt.maximumLoops;
		while (!openSet.isEmpty() && loopsRemaining > 0) {

			// remove current from the open list
			const currentKey = openSet.pop();
			const currentPoint = points[currentKey];
			const currentParent = parents[currentKey];
			const currentCost = costs[currentKey];

			const isRouteBeginning = (currentParent === undefined); // undefined for route starts
			const isStart = currentPoint.equals(start); // (is source anchor or `from` point) = can leave in any direction

			let previousDirectionAngle;
			if (!isRouteBeginning) { previousDirectionAngle = getDirectionAngle(currentParent, currentPoint, numDirections, grid, opt); } else if (!isPathBeginning) { previousDirectionAngle = previousRouteDirectionAngle; } else if (!isStart) { previousDirectionAngle = getDirectionAngle(start, currentPoint, numDirections, grid, opt); } else { previousDirectionAngle = null; } // beginning of path, source anchor or `from` point

			// check if we reached any endpoint
			if (endPointsKeys.indexOf(currentKey) >= 0) {
				opt.previousDirectionAngle = previousDirectionAngle;
				return reconstructRoute(parents, points, currentPoint, start, end, opt);
			}

			// go over all possible directions and find neighbors
			for (let i = 0; i < numDirections; i++) {
				direction = directions[i];

				const directionAngle = direction.angle;
				directionChange = getDirectionChange(previousDirectionAngle, directionAngle);

				// if the direction changed rapidly, don't use this point
				// any direction is allowed for starting points
				if (!(isPathBeginning && isStart) && directionChange > opt.maxAllowedDirectionChange) { continue; }

				const neighborPoint = currentPoint.clone().offset(direction.gridOffsetX, direction.gridOffsetY);
				const neighborKey = getKey(neighborPoint);

				// Closed points from the openSet were already evaluated.
				if (openSet.isClose(neighborKey) || !map.isPointAccessible(neighborPoint)) { continue; }

				// We can only enter end points at an acceptable angle.
				if (endPointsKeys.indexOf(neighborKey) >= 0) { // neighbor is an end point
					round(neighborPoint, opt); // remove rounding errors

					const isNeighborEnd = neighborPoint.equals(end); // (is target anchor or `to` point) = can be entered in any direction

					if (!isNeighborEnd) {
						const endDirectionAngle = getDirectionAngle(neighborPoint, end, numDirections, grid, opt);
						const endDirectionChange = getDirectionChange(directionAngle, endDirectionAngle);

						if (endDirectionChange > opt.maxAllowedDirectionChange) { continue; }
					}
				}

				// The current direction is ok.

				const neighborCost = direction.cost;
				const neighborPenalty = isStart ? 0 : opt.penalties[directionChange]; // no penalties for start point
				const costFromStart = currentCost + neighborCost + neighborPenalty;

				if (!openSet.isOpen(neighborKey) || (costFromStart < costs[neighborKey])) {
					// neighbor point has not been processed yet
					// or the cost of the path from start is lower than previously calculated

					points[neighborKey] = neighborPoint;
					parents[neighborKey] = currentPoint;
					costs[neighborKey] = costFromStart;
					openSet.add(neighborKey, costFromStart + estimateCost(neighborPoint, endPoints));
				}
			}

			loopsRemaining--;
		}
	}

	// no route found (`to` point either wasn't accessible or finding route took
	// way too much calculation)
	return opt.fallbackRoute.call(this, start, end, opt);
}

// resolve some of the options
function resolveOptions(opt: any) {

	opt.directions = util.result(opt, "directions");
	opt.penalties = util.result(opt, "penalties");
	opt.paddingBox = util.result(opt, "paddingBox");

	util.toArray(opt.directions).forEach(function(direction: any) {

		const point1 = new g.Point(0, 0);
		const point2 = new g.Point(direction.offsetX, direction.offsetY);

		direction.angle = g.normalizeAngle(point1.theta(point2));
	});
}

// initialization of the route finding
function router(vertices: any, opt: any, linkView: any) {

	resolveOptions(opt);

	// enable/disable linkView perpendicular option
	linkView.options.perpendicular = !!opt.perpendicular;

	const sourceBBox = getSourceBBox(linkView, opt);
	const targetBBox = getTargetBBox(linkView, opt);

	const sourceAnchor = getSourceAnchor(linkView, opt);
	// let targetAnchor = getTargetAnchor(linkView, opt);

	// pathfinding
	const map = (new ObstacleMap(opt)).build(linkView.paper.model, linkView.model);
	const oldVertices = util.toArray(vertices).map(g.Point);
	const newVertices: any = [];
	let tailPoint = sourceAnchor; // the origin of first route's grid, does not need snapping

	// find a route by concatenating all partial routes (routes need to pass through vertices)
	// source -> vertex[1] -> ... -> vertex[n] -> target
	let to: any;
	for (let i = 0, len = oldVertices.length; i <= len; i++) {

		let partialRoute = null;

		const from = to || sourceBBox;
		to = oldVertices[i];

		if (!to) {
			// this is the last iteration
			// we ran through all vertices in oldVertices
			// 'to' is not a vertex.

			to = targetBBox;

			// If the target is a point (i.e. it's not an element), we
			// should use dragging route instead of main routing method if it has been provided.
			const isEndingAtPoint = !linkView.model.get("source").id || !linkView.model.get("target").id;

			if (isEndingAtPoint && util.isFunction(opt.draggingRoute)) {
				// Make sure we are passing points only (not rects).
				const dragFrom = (from === sourceBBox) ? sourceAnchor : from;
				const dragTo = to.origin();

				partialRoute = opt.draggingRoute.call(linkView, dragFrom, dragTo, opt);
			}
		}

		// if partial route has not been calculated yet use the main routing method to find one
		partialRoute = partialRoute || findRoute.call(linkView, from, to, map, opt);

		if (partialRoute === null) { // the partial route cannot be found
			return opt.fallbackRouter(vertices, opt, linkView);
		}

		const leadPoint = partialRoute[0];

		// remove the first point if the previous partial route had the same point as last
		if (leadPoint && leadPoint.equals(tailPoint)) { partialRoute.shift(); }

		// save tailPoint for next iteration
		tailPoint = partialRoute[partialRoute.length - 1] || tailPoint;

		Array.prototype.push.apply(newVertices, partialRoute);
	}

	return newVertices;
}

// public function
export function slangRouter(vertices: any, opt: any, linkView: any): any {
	return router(vertices, util.assign({}, config, opt), linkView);
}
