import {dia, g} from "jointjs";
import {HTMLCanvas} from "../cavas";
import {View} from "./view";

export abstract class PaperView extends View {

    protected graph = new dia.Graph();
    private readonly paper: dia.Paper;

    protected constructor(canvas: HTMLCanvas) {
        super(canvas);
        this.paper = this.createPaper();
        this.redirectPaperEvents();
        this.addZooming();
        this.addPanning();
        this.catchPaperEvents();
    }

    public resize(width: number, height: number) {
        this.paper.setDimensions(width, height);
        this.paper.translate(width / 2, height / 2);
    }

    protected getGraph(): dia.Graph {
        return this.graph;
    }

    protected reset() {
        this.paper.scale(1.0);
        this.center();
    }

    protected center() {
        this.paper.setOrigin(this.paper.options.width! / 2, this.paper.options.height! / 2);
    }

    protected createPaper(opt: dia.Paper.Options = {}): dia.Paper {
        const container = this.getCanvas().getHTMLElement();
        container.innerHTML = '';
        const inner = document.createElement('div');
        container.appendChild(inner);

        opt = Object.assign({
            el: inner,
            model: this.graph,
            gridSize: 10,
            drawGrid: true,
            interactive: function (cellView: dia.CellView) {
                if (cellView.model.attr('draggable') === false) {
                    return false;
                }
                if (cellView.model.isLink()) {
                    return {vertexAdd: false};
                }
                return true;
            },
            restrictTranslate: function (elementView: dia.ElementView): g.PlainRect {
                const fn = elementView.model.get('restrictTranslate');
                if (typeof fn === "function") {
                    return fn();
                }
                return {x: -(Number.MAX_VALUE / 2), y: -(Number.MAX_VALUE / 2), width: Number.MAX_VALUE, height: Number.MAX_VALUE};
            },
        }, opt);
        
        return new dia.Paper(opt);
    }

    protected redirectPaperEvents() {
        const paper = this.paper;

        ['mousewheel'].forEach(event => {
            (function (event) {
                paper.on('cell:' + event, function (cellView: dia.CellView, evt: Event, x: number, y: number, delta: number) {
                    cellView.model.trigger(event, cellView, evt, x, y, delta);
                });
            })(event);
        });
        ['pointerdblclick', 'pointerclick', 'contextmenu', 'pointerdown', 'pointermove', 'pointerup'].forEach(event => {
            (function (event) {
                paper.on('cell:' + event, function (cellView: dia.CellView, evt: Event, x: number, y: number) {
                    cellView.model.trigger(event, cellView, evt, x, y);
                });
            })(event);
        });
        ['mouseover', 'mouseout', 'mouseenter', 'mouseleave'].forEach(event => {
            (function (event) {
                paper.on('cell:' + event, function (cellView: dia.CellView, evt: Event) {
                    cellView.model.trigger(event, cellView, evt);
                });
            })(event);
        });
    }

    protected addZooming(speed = 0.1, min = 0.5, max = 2.5) {
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

    protected addPanning() {
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
            if (cellView.model.attr('draggable') === false) {
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

    protected catchPaperEvents() {
        const paper = this.paper;
        paper.on('blank:mousewheel', function (evt: Event, x: number, y: number, delta: number) {
            evt.preventDefault();
        });
        paper.on('cell:mousewheel', function (cellView: dia.CellView, evt: Event, x: number, y: number, delta: number) {
            evt.preventDefault();
        });
    }

    protected getWidth(): number {
        return this.paper.getArea().width;
    }

    protected getHeight(): number {
        return this.paper.getArea().height;
    }
    
}
