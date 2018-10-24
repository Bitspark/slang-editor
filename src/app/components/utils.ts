import {dia} from "jointjs";

/**
 * Passes events triggered on a paper to the according cells.
 * @param paper to redirect events for
 */
export function redirectPaperEvents(paper: dia.Paper) {
    ['mousewheel'].forEach(event => {
        (function (event) {
            paper.on('cell:' + event, function (cellView: dia.CellView, evt: Event, x: number, y: number, delta: number) {
                cellView.model.trigger(event, evt, x, y, delta);
            });
        })(event);
    });
    ['pointerdblclick', 'pointerclick', 'contextmenu', 'pointerdown', 'pointermove', 'pointerup'].forEach(event => {
        (function (event) {
            paper.on('cell:' + event, function (cellView: dia.CellView, evt: Event, x: number, y: number) {
                cellView.model.trigger(event, evt, x, y);
            });
        })(event);
    });
    ['mouseover', 'mouseout', 'mouseenter', 'mouseleave'].forEach(event => {
        (function (event) {
            paper.on('cell:' + event, function (cellView: dia.CellView, evt: Event) {
                cellView.model.trigger(event, evt);
            });
        })(event);
    });
}

export function addPanning(paper: dia.Paper) {
    let panning = false;
    let startX: number = 0;
    let startY: number = 0;

    const startPanning = function (x: number, y: number) {
        const scale = paper.scale().sx;
        startX = x * scale;
        startY = y * scale;
        panning = true;
    };

    const stopPanning = function () {
        panning = false;
    };

    const doPanning = function (x: number, y: number) {
        if (panning) {
            const deltaX = x - startX;
            const deltaY = y - startY;
            paper.translate(deltaX, deltaY);
        }
    };

    paper.on('blank:pointerdown', function (evt: Event, x: number, y: number) {
        startPanning(x, y);
    });
    paper.on('blank:pointerup', function (evt: Event, x: number, y: number) {
        stopPanning();
    });
    paper.on('cell:pointerup', function (cellView: dia.CellView, evt: Event, x: number, y: number) {
        stopPanning();
    });
    paper.svg.addEventListener('mousemove', function (event: any) {
        doPanning(event.offsetX, event.offsetY);
    });
}

export function addZooming(paper: dia.Paper, speed = 0.15, min = 0.1, max = 10.0) {
    const zoom = function (x: number, y: number, delta: number) {
        const scale = paper.scale();
        const oldScale = scale.sx;

        let newScale = oldScale + oldScale * delta * speed;
        if (newScale < min) {
            newScale = min;
        }
        if (newScale > max) {
            newScale = max;
        }

        paper.scale(newScale, newScale);

        const translation = paper.translate();
        const [px, py] = [translation.tx, translation.ty];
        const deltaPx = x * (oldScale - newScale);
        const deltaPy = y * (oldScale - newScale);
        paper.translate(px + deltaPx, py + deltaPy);
    };

    paper.on('blank:mousewheel', function (evt: Event, x: number, y: number, delta: number) {
        zoom(x, y, delta);
    });
    paper.on('cell:mousewheel', function (cellView: dia.CellView, evt: Event, x: number, y: number, delta: number) {
        zoom(x, y, delta);
    });
}

export function fillParent(paper: dia.Paper, el: HTMLElement) {
    paper.setDimensions(el.clientWidth!, el.clientHeight!);
}