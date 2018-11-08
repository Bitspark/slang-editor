import {g} from "jointjs";

export function slangConnector(sourcePoint: g.PlainPoint, targetPoint: g.PlainPoint, route: Array<g.PlainPoint>, opt: any) {
    opt || (opt = {});

    const offset = opt.radius || 10;
    const raw = opt.raw;
    const path = new g.Path();
    let segment = g.Path.createSegment("M", sourcePoint);
    path.appendSegment(segment);

    const _13 = 1 / 3;
    const _23 = 2 / 3;

    let nextDistance: number | undefined = undefined;
    for (let index = 0, n = route.length; index < n; index++) {

        const curr = new g.Point(route[index]);

        const prev = route[index - 1] || sourcePoint;
        const next = route[index + 1] || targetPoint;

        const prevDistance = nextDistance || (curr.distance(prev) / 2);
        nextDistance = curr.distance(next) / 2;

        const startMove = -Math.min(offset, prevDistance);
        const endMove = -Math.min(offset, nextDistance);

        const roundedStart = curr.clone().move(prev, startMove).round();
        const roundedEnd = curr.clone().move(next, endMove).round();

        const control1 = new g.Point((_13 * roundedStart.x) + (_23 * curr.x), (_23 * curr.y) + (_13 * roundedStart.y));
        const control2 = new g.Point((_13 * roundedEnd.x) + (_23 * curr.x), (_23 * curr.y) + (_13 * roundedEnd.y));

        segment = g.Path.createSegment("L", roundedStart);
        path.appendSegment(segment);

        segment = g.Path.createSegment("C", control1, control2, roundedEnd);
        path.appendSegment(segment);
    }

    segment = g.Path.createSegment("L", targetPoint);
    path.appendSegment(segment);

    return raw ? path : path.serialize();
}