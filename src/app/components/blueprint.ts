import {dia, layout, shapes} from 'jointjs';
import {JointJSElements} from '../custom/utils';
import {BlueprintModel} from '../model/blueprint';
import {OperatorModel} from '../model/operator';
import {slangRouter} from '../custom/router';
import {slangConnector} from '../custom/connector';
import {BlackBox} from '../custom/nodes';

export class BlueprintComponent {
    private outerVisible: dia.Element;
    private embeddingOuterInvisible: dia.Element;
    private outerPadding = 80;

    constructor(private graph: dia.Graph, private blueprint: BlueprintModel) {
        graph.clear();

        this.attachEventHandlers();
        this.subscribe();

        [this.outerVisible, this.embeddingOuterInvisible] = this.createOuter();
        this.createOperators();
        this.createConnections();

        this.autoLayout();
        this.fitEmbedding();
        this.positionCenter();
    }

    private attachEventHandlers() {
        const that = this;
        this.graph.on('change:position change:size', function (cell: dia.Cell, newPosition: dia.Point, opt: any) {
            if (opt.skipMirrorHandler) return;

            const mirror = cell.get('mirror') as dia.Cell | undefined;
            if (mirror) {
                mirror.set({
                    position: cell.get('position'),
                    size: cell.get('size')
                }, ({skipMirrorHandler: true} as any));
            }
        });
        this.graph.on('change:position change:size', function (cell: dia.Cell, newPosition: dia.Point, opt: any) {
            if (opt.skipParentHandler) return;

            const parentId = cell.get('parent');
            if (!parentId) return;

            const parent = that.graph.getCell(parentId);
            const outerPadding = that.outerPadding;

            let newX: number | undefined = undefined;
            let newY: number | undefined = undefined;
            let newCornerX: number | undefined = undefined;
            let newCornerY: number | undefined = undefined;

            Array.from(parent.getEmbeddedCells()).forEach((child: dia.Cell, index: number, array: Array<dia.Cell>) => {
                const childBbox = (child as dia.Element).getBBox();
                if (!newX || childBbox.x < newX) {
                    newX = childBbox.x;
                }
                if (!newY || childBbox.y < newY) {
                    newY = childBbox.y;
                }
                if (!newCornerX || childBbox.corner().x > newCornerX) {
                    newCornerX = childBbox.corner().x;
                }
                if (!newCornerY || childBbox.corner().y > newCornerY) {
                    newCornerY = childBbox.corner().y;
                }
            });

            const set = {
                position: {
                    x: -outerPadding,
                    y: -outerPadding
                },
                size: {
                    width: 2 * outerPadding,
                    height: 2 * outerPadding
                }
            };
            
            if (typeof newX !== 'undefined' &&
                typeof newY !== 'undefined' &&
                typeof newCornerX !== 'undefined' &&
                typeof newCornerY !== 'undefined') {
                set.position.x = newX - outerPadding;
                set.position.y = newY - outerPadding;
                set.size.width = newCornerX - newX + 2 * outerPadding;
                set.size.height = newCornerY - newY + 2 * outerPadding;
            }
            
            parent.set(set, ({skipParentHandler: true} as any));
        });
    }

    private subscribe() {
        const that = this;
        this.blueprint.subscribeOperatorAdded(function (op: OperatorModel) {
            that.addOperator(op);
        });
    }

    private createOuter(): [dia.Element, dia.Element] {
        const size = {width: this.outerPadding * 2 + 10, height: this.outerPadding * 2 + 10};

        const outer = JointJSElements.createBlackBoxElement(this.blueprint);
        outer.attr('body/fill', 'blue');
        outer.attr('body/fill-opacity', '.05');
        outer.set('obstacle', false);
        outer.set('inward', true);
        outer.set('size', size);
        outer.addTo(this.graph);

        const outerParent = new shapes.standard.Rectangle({});
        outerParent.attr('body/stroke-opacity', '0.2');
        outerParent.attr('body/fill-opacity', '0.2');
        outerParent.set('obstacle', false);
        outerParent.set('inward', true);
        outerParent.set('size', size);
        outerParent.addTo(this.graph);

        outerParent.set('mirror', outer);
        outer.set('mirror', outerParent);

        return [outer, outerParent];
    }

    private createOperators() {
        for (const op of this.blueprint.getOperators()) {
            this.addOperator(op);
        }
    }

    private createConnections() {
        for (const connection of this.blueprint.getConnections().getConnections()) {
            const sourceOwner = connection.source.getAncestorNode<BlackBox>(BlackBox);
            const destinationOwner = connection.destination.getAncestorNode<BlackBox>(BlackBox);

            const link = new dia.Link({
                source: {
                    id: sourceOwner!.getIdentity(),
                    port: connection.source.getIdentity()
                },
                target: {
                    id: destinationOwner!.getIdentity(),
                    port: connection.destination.getIdentity()
                },
                router: slangRouter,
                connector: slangConnector,
                attrs: {
                    '.connection': {
                        stroke: '#777777',
                        'stroke-width': 2
                    }
                }
            });
            link.addTo(this.graph);
        }
    }

    private autoLayout() {
        layout.DirectedGraph.layout(this.graph, {
            nodeSep: 80,
            rankSep: 80,
            edgeSep: 240,
            rankDir: 'TB'
        });
    }

    private fitEmbedding() {
        this.embeddingOuterInvisible.fitEmbeds({padding: this.outerPadding});
    }

    private positionCenter() {
        const position = this.embeddingOuterInvisible.position();
        const bbox = this.embeddingOuterInvisible.getBBox();
        this.embeddingOuterInvisible.translate(-(position.x + bbox.width / 2), -(position.y + bbox.height / 2));
    }

    private addOperator(operator: OperatorModel) {
        const portOwnerElement = JointJSElements.createBlackBoxElement(operator as BlackBox);
        portOwnerElement.set('obstacle', true);
        portOwnerElement.set('inward', false);
        this.embeddingOuterInvisible.embed(portOwnerElement);
        this.graph.addCell(portOwnerElement);

        // JointJS -> Model
        portOwnerElement.on('pointerclick', function (evt: Event, x: number, y: number) {
            operator.select();
        });

        // Model -> JointJS
        operator.subscribeDeleted(function () {
            portOwnerElement.remove();
        });
        operator.subscribeSelectChanged(function (selected: boolean) {
            if (selected) {
                portOwnerElement.attr('body/fill', 'orange');
            } else {
                portOwnerElement.attr('body/fill', 'blue');
            }
        });
    }
}