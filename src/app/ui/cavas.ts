import {dia} from "jointjs";

export class Canvas {
    private graph = new dia.Graph();
    private paper: dia.Paper;

    constructor(private container: HTMLElement) {
        this.createPaper();
        this.redirectPaperEvents();
        this.addZooming();
        this.addPanning();
    }

    public resize(width: number, height: number) {
        this.paper.setDimensions(width, height);
        this.paper.translate(width / 2, height / 2);
    }

    public getGraph(): dia.Graph {
        return this.graph;
    }

    public reset() {
        this.paper.scale(1.0);
        this.paper.translate(this.paper.getArea().width / 2, this.paper.getArea().height / 2);
    }

    private createPaper() {
        this.container.innerHTML = '';
        const inner = document.createElement('div');
        this.container.appendChild(inner);

        this.paper = new dia.Paper({
            el: inner,
            model: this.graph,
            gridSize: 10,
            drawGrid: true,
            interactive: function (cellView: dia.CellView) {
                return cellView.model.attr('draggable') !== false;
            }
        });
    }

    private redirectPaperEvents() {
        const paper = this.paper;

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

    private addZooming(speed = 0.15, min = 0.1, max = 10.0) {
        const paper = this.paper;
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

    private addPanning() {
        const paper = this.paper;

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
        paper.on('cell:pointerdown', function (cellView: dia.CellView, evt: Event, x: number, y: number) {
            if (cellView.model.attr("draggable") === false) {
                startPanning(x, y);
            }
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

    public getWidth(): number {
        return this.paper.getArea().width;
    }

    public getHeight(): number {
        return this.paper.getArea().height;
    }

}
