import {g} from "jointjs";

function movePoint(p: g.PlainPoint, i: number, total: number): g.PlainPoint {
    const x = p.x + i * 3;
    const y = p.y + i * 0;
    return {x, y};
}

export function slangConnector(sourcePoint: g.PlainPoint, targetPoint: g.PlainPoint, route: Array<g.PlainPoint>, opt: any) {
    opt || (opt = {});

    const streamStack = 1;
    
    let svg = '';
    for (let i = 0; i < streamStack; i++) {
        const sourcePointI = movePoint(sourcePoint, i, streamStack);
        const targetPointI = movePoint(targetPoint, i, streamStack);
        const routeI = route.map(p => movePoint(p, i, streamStack));
        
        const offset = opt.radius || 10;
        // const raw = opt.raw;
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