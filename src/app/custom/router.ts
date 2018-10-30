import {dia, g, routers, util as jointUtil} from "jointjs";

const util = jointUtil as any;

const joint = {
    util: jointUtil as any,
    routers: routers
};

const config = {
    maxAllowedDirectionChange: 45,

    diagonalCost: function () {
        return 1.4142 * this.step;
    },

    directions: function () {
        const step = this.step;
        const cost = this.cost();
        const diagonalCost = this.diagonalCost();

        return [
            {offsetX: step, offsetY: 0, cost: cost},
            {offsetX: step, offsetY: step, cost: diagonalCost},
            {offsetX: 0, offsetY: step, cost: cost},
            {offsetX: -step, offsetY: step, cost: diagonalCost},
            {offsetX: -step, offsetY: 0, cost: cost},
            {offsetX: -step, offsetY: -step, cost: diagonalCost},
            {offsetX: 0, offsetY: -step, cost: cost},
            {offsetX: step, offsetY: -step, cost: diagonalCost}
        ];
    },

    fallbackRoute: function (from: any, to: any, opt: any) {
        // Find a route which breaks by 45 degrees ignoring all obstacles.

        var theta = from.theta(to);

        var route = [];

        var a = {x: to.x, y: from.y};
        var b = {x: from.x, y: to.y};

        if (theta % 180 > 90) {
            var t = a;
            a = b;
            b = t;
        }

        var p1 = (theta % 90) < 45 ? a : b;
        var l1 = new g.Line(from, p1);

        var alpha = 90 * Math.ceil(theta / 90);

        var p2 = g.Point.fromPolar(l1.squaredLength(), g.toRad(alpha + 135), p1);
        var l2 = new g.Line(to, p2);

        var intersectionPoint = (l1 as any).intersection(l2);
        var point = intersectionPoint ? intersectionPoint : to;

        var directionFrom = intersectionPoint ? point : from;

        var quadrant = 360 / opt.directions.length;
        var angleTheta = directionFrom.theta(to);
        var normalizedAngle = g.normalizeAngle(angleTheta + (quadrant / 2));
        var directionAngle = quadrant * Math.floor(normalizedAngle / quadrant);

        opt.previousDirectionAngle = directionAngle;

        if (point) route.push(point.round());
        route.push(to);

        return route;
    },

    // size of the step to find a route (the grid of the manhattan pathfinder)
    step: 10,

    // the number of route finding loops that cause the router to abort
    // returns fallback route instead
    maximumLoops: 2000,

    // the number of decimal places to round floating point coordinates
    precision: 10,

    // should the router use perpendicular linkView option?
    // does not connect anchor of element but rather a point close-by that is orthogonal
    // this looks much better
    perpendicular: true,

    // should the source and/or target not be considered as obstacles?
    excludeEnds: [], // 'source', 'target'

    // should certain types of elements not be considered as obstacles?
    excludeTypes: ['basic.Text'],

    // possible starting directions from an element
    startDirections: ['top', 'right', 'bottom', 'left'],

    // possible ending directions to an element
    endDirections: ['top', 'right', 'bottom', 'left'],

    // specify the directions used above and what they mean
    directionMap: {
        top: {x: 0, y: -1},
        right: {x: 1, y: 0},
        bottom: {x: 0, y: 1},
        left: {x: -1, y: 0}
    },

    // cost of an orthogonal step
    cost: function () {

        return this.step;
    },

    // a penalty received for direction change
    penalties: function () {

        return {
            0: 0,
            45: this.step / 2,
            90: this.step / 2
        };
    },

    // padding applied on the element bounding boxes
    paddingBox: function (): g.Rect {
        let step = this.step * 2;
        return new g.Rect(
            -step,
            -step,
            2 * step,
            2 * step
        );
    },

    // padding applied on the element bounding boxes
    inwardPaddingBox: function (): g.Rect {
        let step = -this.step * 1;
        return new g.Rect(
            -step,
            -step,
            2 * step,
            2 * step
        );
    },

    // a router to use when the manhattan router fails
    // (one of the partial routes returns null)
    fallbackRouter: function (vertices: Array<g.Point>, opt: any, linkView: dia.LinkView): Array<g.PlainPoint> {
        if (!util.isFunction(joint.routers.orthogonal)) {
            throw new Error('Manhattan requires the orthogonal router as default fallback.');
        }

        return joint.routers.orthogonal(vertices, util.assign({}, config, opt), linkView);
    },

    // if a function is provided, it's used to route the link while dragging an end
    // i.e. function(from, to, opt) { return []; }
    draggingRoute: null
};

// HELPER CLASSES //

// Map of obstacles
// Helper structure to identify whether a point lies inside an obstacle.
class ObstacleMap {

    public map: any = {};
    public inverseMap: any = {};
    // tells how to divide the paper when creating the elements map
    public mapGridSize = 200;
    public options: any;

    constructor(public opt: any) {
        this.options = opt;
    }

    public build(graph: any, link: any) {

        let opt = this.options;

        // source or target element could be excluded from set of obstacles
        let excludedEnds = util.toArray(opt.excludeEnds).reduce(function (res: any, item: any) {

            let end = link.get(item);
            if (end) {
                let cell = graph.getCell(end.id);
                if (cell) {
                    res.push(cell);
                }
            }

            return res;
        }, []);

        // Exclude any embedded elements from the source and the target element.
        let excludedAncestors: any = [];

        let source = graph.getCell(link.get('source').id);
        if (source) {
            excludedAncestors = util.union(excludedAncestors, source.getAncestors().map(function (cell: dia.Cell) {
                return cell.id
            }));
        }

        let target = graph.getCell(link.get('target').id);
        if (target) {
            excludedAncestors = util.union(excludedAncestors, target.getAncestors().map(function (cell: dia.Cell) {
                return cell.id
            }));
        }

        const mapGridSize = this.mapGridSize;
        
        graph.getElements().reduce(function (map: any, element: any) {
            const isExcludedType = util.toArray(opt.excludeTypes).includes(element.get('type'));
            const isExcludedEnd = excludedEnds.find(function (excluded: any) {
                return excluded.id === element.id
            });
            const isExcludedAncestor = excludedAncestors.includes(element.id);
            const isExcludedExplicitly = element.get('obstacle') === false;
            const isInward = element.get('inward') === true;

            const isExcluded = isExcludedType || isExcludedEnd || isExcludedAncestor || isExcludedExplicitly || isInward;
            if (!isExcluded) {
                let bbox = element.getBBox().moveAndExpand(opt.paddingBox);

                let origin = bbox.origin().snapToGrid(mapGridSize);
                let corner = bbox.corner().snapToGrid(mapGridSize);

                for (let x = origin.x; x <= corner.x; x += mapGridSize) {
                    for (let y = origin.y; y <= corner.y; y += mapGridSize) {
                        let gridKey = x + '@' + y;
                        map[gridKey] = map[gridKey] || [];
                        map[gridKey].push(bbox);
                    }
                }
            }

            return map;
        }, this.map);

        graph.getElements().reduce(function (map: any, element: any) {
            const isExcludedType = util.toArray(opt.excludeTypes).includes(element.get('type'));
            const isExcludedEnd = excludedEnds.find(function (excluded: any) {
                return excluded.id === element.id
            });
            const isExcludedAncestor = excludedAncestors.includes(element.id);
            const isInward = element.get('inward') === true;

            const isExcluded = isExcludedType || isExcludedEnd || isExcludedAncestor || !isInward;
            if (!isExcluded) {
                let bbox = element.getBBox().moveAndExpand(opt.inwardPaddingBox);

                let origin = bbox.origin().snapToGrid(mapGridSize);
                let corner = bbox.corner().snapToGrid(mapGridSize);

                for (let x = origin.x; x <= corner.x; x += mapGridSize) {
                    for (let y = origin.y; y <= corner.y; y += mapGridSize) {
                        let gridKey = x + '@' + y;
                        map[gridKey] = map[gridKey] || [];
                        map[gridKey].push(bbox);
                    }
                }
            }

            return map;
        }, this.inverseMap);

        return this;
    };

    isPointAccessible(point: any) {        
        const mapKey = point.clone().snapToGrid(this.mapGridSize).toString();
        const noObstacle = util.toArray(this.map[mapKey]).every(function (obstacle: any) {
            return !obstacle.containsPoint(point);
        });
        const onRestricted = util.toArray(this.inverseMap[mapKey]).every(function (obstacle: any) {
            return obstacle.containsPoint(point);
        });
        return noObstacle && onRestricted;
    };
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

        let index = joint.util.sortedIndex(this.items, item, function (this: any, i: number) {
            return this.values[i];
        }.bind(this));

        this.items.splice(index, 0, item);
    };

    public remove(item: any) {
        this.hash[item] = this.CLOSE;
    };

    public isOpen(item: any) {
        return this.hash[item] === this.OPEN;
    };

    public isClose(item: any) {
        return this.hash[item] === this.CLOSE;
    };

    public isEmpty() {
        return this.items.length === 0;
    };

    public pop() {
        const item = this.items.shift();
        this.remove(item);
        return item;
    };
}

// HELPERS //

// return source bbox
function getSourceBBox(linkView: any, opt: any) {

    // expand by padding box
    if (opt && opt.paddingBox) return linkView.sourceBBox.clone().moveAndExpand(opt.paddingBox);

    return linkView.sourceBBox.clone();
}

// return target bbox
function getTargetBBox(linkView: any, opt: any) {

    // expand by padding box
    if (opt && opt.paddingBox) return linkView.targetBBox.clone().moveAndExpand(opt.paddingBox);

    return linkView.targetBBox.clone();
}

// return source anchor
function getSourceAnchor(linkView: any, opt: any) {

    if (linkView.sourceAnchor) return linkView.sourceAnchor;

    // fallback: center of bbox
    let sourceBBox = getSourceBBox(linkView, opt);
    return sourceBBox.center();
}

// return target anchor
function getTargetAnchor(linkView: any, opt: any) {

    if (linkView.targetAnchor) return linkView.targetAnchor;

    // fallback: center of bbox
    let targetBBox = getTargetBBox(linkView, opt);
    return targetBBox.center(); // default
}

// returns a direction index from start point to end point
// corrects for grid deformation between start and end
function getDirectionAngle(start: any, end: any, numDirections: any, grid: any, opt: any) {

    let quadrant = 360 / numDirections;
    let angleTheta = start.theta(fixAngleEnd(start, end, grid, opt));
    let normalizedAngle = g.normalizeAngle(angleTheta + (quadrant / 2));
    return quadrant * Math.floor(normalizedAngle / quadrant);
}

// helper function for getDirectionAngle()
// corrects for grid deformation
// (if a point is one grid steps away from another in both dimensions,
// it is considered to be 45 degrees away, even if the real angle is different)
// this causes visible angle discrepancies if `opt.step` is much larger than `paper.gridSize`
function fixAngleEnd(start: any, end: any, grid: any, opt: any) {

    let step = opt.step;

    let diffX = end.x - start.x;
    let diffY = end.y - start.y;

    let gridStepsX = diffX / grid.x;
    let gridStepsY = diffY / grid.y

    let distanceX = gridStepsX * step;
    let distanceY = gridStepsY * step;

    return new g.Point(start.x + distanceX, start.y + distanceY);
}

// return the change in direction between two direction angles
function getDirectionChange(angle1: any, angle2: any) {

    let directionChange = Math.abs(angle1 - angle2);
    return (directionChange > 180) ? (360 - directionChange) : directionChange;
}

// fix direction offsets according to current grid
function getGridOffsets(directions: any, grid: any, opt: any) {

    let step = opt.step;

    util.toArray(opt.directions).forEach(function (direction: any) {

        direction.gridOffsetX = (direction.offsetX / step) * grid.x;
        direction.gridOffsetY = (direction.offsetY / step) * grid.y;
    });
}

// get grid size in x and y dimensions, adapted to source and target positions
function getGrid(step: any, source: any, target: any) {

    return {
        source: source.clone(),
        x: getGridDimension(target.x - source.x, step),
        y: getGridDimension(target.y - source.y, step)
    }
}

// helper function for getGrid()
function getGridDimension(diff: any, step: any) {

    // return step if diff = 0
    if (!diff) return step;

    let absDiff = Math.abs(diff);
    let numSteps = Math.round(absDiff / step);

    // return absDiff if less than one step apart
    if (!numSteps) return absDiff;

    // otherwise, return corrected step
    let roundedDiff = numSteps * step;
    let remainder = absDiff - roundedDiff;
    let stepCorrection = remainder / numSteps;

    return step + stepCorrection;
}

// return a clone of point snapped to grid
function snapToGrid(point: any, grid: any) {

    let source = grid.source;

    let snappedX = g.snapToGrid(point.x - source.x, grid.x) + source.x;
    let snappedY = g.snapToGrid(point.y - source.y, grid.y) + source.y;

    return new g.Point(snappedX, snappedY);
}

// round the point to opt.precision
function round(point: any, opt: any) {

    if (!point) return point;

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
        point.y === 0 ? 0 : Math.abs(point.y) / point.y
    );
}

// PATHFINDING //

// reconstructs a route by concatenating points with their parents
function reconstructRoute(parents: any, points: any, tailPoint: any, from: any, to: any, opt: any) {

    let route = [];

    let prevDiff = normalizePoint(to.difference(tailPoint));

    let currentKey = getKey(tailPoint);
    let parent = parents[currentKey];

    let point;
    while (parent) {

        point = round(points[currentKey], opt);

        let diff = normalizePoint(point.difference(round(parent.clone(), opt)));
        if (!diff.equals(prevDiff)) {
            route.unshift(point);
            prevDiff = diff;
        }

        currentKey = getKey(parent);
        parent = parents[currentKey];
    }

    let leadPoint = round(points[currentKey], opt);

    let fromDiff = normalizePoint(leadPoint.difference(from));
    if (!fromDiff.equals(prevDiff)) {
        route.unshift(leadPoint);
    }

    return route;
}

// heuristic method to determine the distance between two points
function estimateCost(from: any, endPoints: any) {

    let min = Infinity;

    for (let i = 0, len = endPoints.length; i < len; i++) {
        let cost = from.manhattanDistance(endPoints[i]);
        if (cost < min) min = cost;
    }

    return min;
}

// find points around the bbox taking given directions into account
// lines are drawn from anchor in given directions, intersections recorded
// if anchor is outside bbox, only those directions that intersect get a rect point
// the anchor itself is returned as rect point (representing some directions)
// (since those directions are unobstructed by the bbox)
function getRectPoints(anchor: any, bbox: any, directionList: any, grid: any, opt: any) {

    let directionMap = opt.directionMap;

    let snappedAnchor = round(snapToGrid(anchor, grid), opt);
    let snappedCenter = round(snapToGrid(bbox.center(), grid), opt);
    let anchorCenterVector = snappedAnchor.difference(snappedCenter);

    let keys = util.isObject(directionMap) ? Object.keys(directionMap) : [];
    let dirList = util.toArray(directionList);
    let rectPoints = keys.reduce(function (res: any, key: any) {

        if (dirList.includes(key)) {
            let direction = directionMap[key];

            // create a line that is guaranteed to intersect the bbox if bbox is in the direction
            // even if anchor lies outside of bbox
            let endpoint = new g.Point(
                snappedAnchor.x + direction.x * (Math.abs(anchorCenterVector.x) + bbox.width),
                snappedAnchor.y + direction.y * (Math.abs(anchorCenterVector.y) + bbox.height)
            );
            let intersectionLine = new g.Line(anchor, endpoint);

            // get the farther intersection, in case there are two
            // (that happens if anchor lies next to bbox)
            let intersections: any = intersectionLine.intersect(bbox) || [];
            let numIntersections = intersections.length;
            let farthestIntersectionDistance;
            let farthestIntersection = null;
            for (let i = 0; i < numIntersections; i++) {
                let currentIntersection = intersections[i];
                let distance = snappedAnchor.squaredDistance(currentIntersection);
                if (farthestIntersectionDistance === undefined || (distance > farthestIntersectionDistance)) {
                    farthestIntersectionDistance = distance;
                    farthestIntersection = snapToGrid(currentIntersection, grid);
                }
            }
            let point = round(farthestIntersection, opt);

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
    if (!bbox.containsPoint(snappedAnchor)) rectPoints.push(snappedAnchor);

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

    let grid = getGrid(opt.step, sourceAnchor, targetAnchor);

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
        let openSet = new SortedSet();
        // Keeps reference to actual points for given elements of the open set.
        let points: any = {};
        // Keeps reference to a point that is immediate predecessor of given element.
        let parents: any = {};
        // Cost from start to a point along best known path.
        let costs: any = {};

        for (let i = 0, n = startPoints.length; i < n; i++) {
            let point = startPoints[i];

            let key = getKey(point);
            openSet.add(key, estimateCost(point, endPoints));
            points[key] = point;
            costs[key] = 0;
        }

        let previousRouteDirectionAngle = opt.previousDirectionAngle; // undefined for first route
        let isPathBeginning = (previousRouteDirectionAngle === undefined);

        // directions
        let direction, directionChange;
        let directions = opt.directions;
        getGridOffsets(directions, grid, opt);

        let numDirections = directions.length;

        let endPointsKeys = util.toArray(endPoints).reduce(function (res: any, endPoint: any) {

            let key = getKey(endPoint);
            res.push(key);
            return res;
        }, []);

        // main route finding loop
        let loopsRemaining = opt.maximumLoops;
        while (!openSet.isEmpty() && loopsRemaining > 0) {

            // remove current from the open list
            let currentKey = openSet.pop();
            let currentPoint = points[currentKey];
            let currentParent = parents[currentKey];
            let currentCost = costs[currentKey];

            let isRouteBeginning = (currentParent === undefined); // undefined for route starts
            let isStart = currentPoint.equals(start); // (is source anchor or `from` point) = can leave in any direction

            let previousDirectionAngle;
            if (!isRouteBeginning) previousDirectionAngle = getDirectionAngle(currentParent, currentPoint, numDirections, grid, opt); // a vertex on the route
            else if (!isPathBeginning) previousDirectionAngle = previousRouteDirectionAngle; // beginning of route on the path
            else if (!isStart) previousDirectionAngle = getDirectionAngle(start, currentPoint, numDirections, grid, opt); // beginning of path, start rect point
            else previousDirectionAngle = null; // beginning of path, source anchor or `from` point

            // check if we reached any endpoint
            if (endPointsKeys.indexOf(currentKey) >= 0) {
                opt.previousDirectionAngle = previousDirectionAngle;
                return reconstructRoute(parents, points, currentPoint, start, end, opt);
            }

            // go over all possible directions and find neighbors
            for (let i = 0; i < numDirections; i++) {
                direction = directions[i];

                let directionAngle = direction.angle;
                directionChange = getDirectionChange(previousDirectionAngle, directionAngle);

                // if the direction changed rapidly, don't use this point
                // any direction is allowed for starting points
                if (!(isPathBeginning && isStart) && directionChange > opt.maxAllowedDirectionChange) continue;

                let neighborPoint = currentPoint.clone().offset(direction.gridOffsetX, direction.gridOffsetY);
                let neighborKey = getKey(neighborPoint);

                // Closed points from the openSet were already evaluated.
                if (openSet.isClose(neighborKey) || !map.isPointAccessible(neighborPoint)) continue;

                // We can only enter end points at an acceptable angle.
                if (endPointsKeys.indexOf(neighborKey) >= 0) { // neighbor is an end point
                    round(neighborPoint, opt); // remove rounding errors

                    let isNeighborEnd = neighborPoint.equals(end); // (is target anchor or `to` point) = can be entered in any direction

                    if (!isNeighborEnd) {
                        let endDirectionAngle = getDirectionAngle(neighborPoint, end, numDirections, grid, opt);
                        let endDirectionChange = getDirectionChange(directionAngle, endDirectionAngle);

                        if (endDirectionChange > opt.maxAllowedDirectionChange) continue;
                    }
                }

                // The current direction is ok.

                let neighborCost = direction.cost;
                let neighborPenalty = isStart ? 0 : opt.penalties[directionChange]; // no penalties for start point
                let costFromStart = currentCost + neighborCost + neighborPenalty;

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

    opt.directions = util.result(opt, 'directions');
    opt.penalties = util.result(opt, 'penalties');
    opt.paddingBox = util.result(opt, 'paddingBox');
    opt.inwardPaddingBox = util.result(opt, 'inwardPaddingBox');

    util.toArray(opt.directions).forEach(function (direction: any) {

        let point1 = new g.Point(0, 0);
        let point2 = new g.Point(direction.offsetX, direction.offsetY);

        direction.angle = g.normalizeAngle(point1.theta(point2));
    });
}

// initialization of the route finding
function router(vertices: any, opt: any, linkView: any) {
    resolveOptions(opt);

    // enable/disable linkView perpendicular option
    linkView.options.perpendicular = !!opt.perpendicular;

    let sourceBBox = getSourceBBox(linkView, opt);
    let targetBBox = getTargetBBox(linkView, opt);

    let sourceAnchor = getSourceAnchor(linkView, opt);
    //let targetAnchor = getTargetAnchor(linkView, opt);

    // pathfinding
    let map = (new ObstacleMap(opt)).build(linkView.paper.model, linkView.model);
    let oldVertices = util.toArray(vertices).map(g.Point);
    let newVertices: any = [];
    let tailPoint = sourceAnchor; // the origin of first route's grid, does not need snapping

    // find a route by concatenating all partial routes (routes need to pass through vertices)
    // source -> vertex[1] -> ... -> vertex[n] -> target
    let to: any;
    for (let i = 0, len = oldVertices.length; i <= len; i++) {

        let partialRoute = null;

        let from = to || sourceBBox;
        to = oldVertices[i];

        if (!to) {
            // this is the last iteration
            // we ran through all vertices in oldVertices
            // 'to' is not a vertex.

            to = targetBBox;

            // If the target is a point (i.e. it's not an element), we
            // should use dragging route instead of main routing method if it has been provided.
            let isEndingAtPoint = !linkView.model.get('source').id || !linkView.model.get('target').id;

            if (isEndingAtPoint && util.isFunction(opt.draggingRoute)) {
                // Make sure we are passing points only (not rects).
                let dragFrom = (from === sourceBBox) ? sourceAnchor : from;
                let dragTo = to.origin();

                partialRoute = opt.draggingRoute.call(linkView, dragFrom, dragTo, opt);
            }
        }

        // if partial route has not been calculated yet use the main routing method to find one
        partialRoute = partialRoute || findRoute.call(linkView, from, to, map, opt);

        if (partialRoute === null) { // the partial route cannot be found
            return opt.fallbackRouter(vertices, opt, linkView);
        }

        let leadPoint = partialRoute[0];

        // remove the first point if the previous partial route had the same point as last
        if (leadPoint && leadPoint.equals(tailPoint)) partialRoute.shift();

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