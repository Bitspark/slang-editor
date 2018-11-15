import {g} from "jointjs";
import {PortModel} from "../../model/port";

function movePoint(p: g.PlainPoint, i: number, total: number): g.PlainPoint {
	if (total <= 1) {
		return p;
	}
	const move = (i - 0.5 * (total - 1)) * 3;
	const x = Math.round(p.x + move);
	const y = p.y;
	return {x, y};
}

function slangConnectorFunction(sourcePoint: g.PlainPoint, targetPoint: g.PlainPoint, route: Array<g.PlainPoint>, lines: number): string {
	let svg = "";
	for (let i = 0; i < lines; i++) {
		const sourcePointI = movePoint(sourcePoint, i, lines);
		const targetPointI = movePoint(targetPoint, i, lines);
		const routeI = route.map(p => movePoint(p, i, lines));

		const offset = 10;
		const path = new g.Path();
		let segment = g.Path.createSegment("M", sourcePointI);
		path.appendSegment(segment);

		const oneThird = 1 / 3;
		const twoThird = 2 / 3;

		let nextDistance: number | undefined = undefined;
		for (let index = 0, n = routeI.length; index < n; index++) {

			const curr = new g.Point(routeI[index]);

			const prev = routeI[index - 1] || sourcePointI;
			const next = routeI[index + 1] || targetPointI;

			const prevDistance = nextDistance || (curr.distance(prev) / 2);
			nextDistance = curr.distance(next) / 2;

			const startMove = -Math.min(offset, prevDistance);
			const endMove = -Math.min(offset, nextDistance);

			const roundedStart = curr.clone().move(prev, startMove).round();
			const roundedEnd = curr.clone().move(next, endMove).round();

			const control1 = new g.Point((oneThird * roundedStart.x) + (twoThird * curr.x), (twoThird * curr.y) + (oneThird * roundedStart.y));
			const control2 = new g.Point((oneThird * roundedEnd.x) + (twoThird * curr.x), (twoThird * curr.y) + (oneThird * roundedEnd.y));

			segment = g.Path.createSegment("L", roundedStart);
			path.appendSegment(segment);

			segment = g.Path.createSegment("C", control1, control2, roundedEnd);
			path.appendSegment(segment);
		}

		segment = g.Path.createSegment("L", targetPointI);
		path.appendSegment(segment);

		svg += path.serialize();
	}
	return svg;
}

export function slangConnector(sourcePort: PortModel, destinationPort: PortModel | null, lines: number): (sourcePoint: g.PlainPoint, targetPoint: g.PlainPoint, route: Array<g.PlainPoint>, opt: any) => string {
	return (sourcePoint: g.PlainPoint, targetPoint: g.PlainPoint, route: Array<g.PlainPoint>) => slangConnectorFunction(sourcePoint, targetPoint, route, lines);
}