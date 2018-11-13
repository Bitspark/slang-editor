import {BlueprintModel, BlueprintType} from './blueprint';
import {OperatorPortModel, PortDirection} from './port';
import {OperatorDelegateModel} from './delegate';
import {BlackBox} from '../custom/nodes';
import {Connections} from '../custom/connections';
import {SlangType} from "../custom/type";
import {SlangBehaviorSubject, SlangSubject} from '../custom/events';

export type OperatorModelArgs = {name: string, blueprint: BlueprintModel, geometry: Geometry | undefined};

export interface Geometry {
    position: [number, number]
}

export class OperatorModel extends BlackBox {

    // Topics
    // self
    private removed = new SlangSubject<void>("removed");
    private selected = new SlangBehaviorSubject<boolean>("selected", false);

    private readonly name: string;
    private readonly blueprint: BlueprintModel;
    private geometry: Geometry | undefined;

    constructor(parent: BlueprintModel, args: OperatorModelArgs) {
        super(parent);
        this.name = args.name;
        this.blueprint = args.blueprint;
        this.geometry = args.geometry;
    }

    public getName(): string {
        return this.name;
    }

    public isSelected(): boolean {
        return this.selected.getValue();
    }

    public getType(): BlueprintType {
        return this.blueprint.getType();
    }

    public getBlueprint(): BlueprintModel {
        return this.blueprint;
    }

    public createPort(type: SlangType, direction: PortDirection): OperatorPortModel {
        return super.createPortFromType(OperatorPortModel, type, direction) as OperatorPortModel;
    }

    public getDelegates(): IterableIterator<OperatorDelegateModel> {
        return this.getChildNodes(OperatorDelegateModel);
    }

    public findDelegate(name: string): OperatorDelegateModel | undefined {
        return this.scanChildNode(OperatorDelegateModel, delegate => delegate.getName() === name);
    }

    public getDisplayName(): string {
        return this.blueprint.getShortName();
    }

    public getConnectionsTo(): Connections {
        const connections = new Connections();

        // First, handle operator out-ports
        const portOut = this.getPortOut();
        if (portOut) {
            connections.addConnections(portOut.getConnectionsTo());
        }

        // Then, handle delegate out-ports
        for (const delegate of this.getChildNodes(OperatorDelegateModel)) {
            connections.addConnections(delegate.getConnectionsTo());
        }

        return connections;
    }

    public get position(): {x: number, y: number} | undefined {
        if (this.geometry) {
            return {x: this.geometry.position[0], y: this.geometry.position[1]};
        }
    }

    // Actions
    public createDelegate(name: string): OperatorDelegateModel {
        return this.createChildNode(OperatorDelegateModel, {name});
    }

    public select() {
        if (!this.selected.getValue()) {
            this.selected.next(true);
        }
    }

    public deselect() {
        if (this.selected.getValue()) {
            this.selected.next(false);
        }
    }

    public delete() {
        this.removed.next();
    }

    public moveTo(pos: [number, number]) {
        if (this.geometry) {
            this.geometry.position = pos;
        } else {
            this.geometry = {position: pos};
        }
    }
}
