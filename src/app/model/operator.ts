import {BlueprintModel, BlueprintType} from './blueprint';
import {OperatorPortModel, PortDirection} from './port';
import {OperatorDelegateModel, OperatorDelegateModelArgs} from './delegate';
import {BlackBox, SlangToken} from '../custom/nodes';
import {Connections} from '../custom/connections';
import {SlangType} from "../custom/type";
import {SlangBehaviorSubject, SlangSubject} from '../custom/events';

export type OperatorModelArgs = {name: string, blueprint: BlueprintModel};

export class OperatorModel extends BlackBox {

    // Topics
    // self
    private removed = new SlangSubject<void>("removed");
    private selected = new SlangBehaviorSubject<boolean>("selected", false);

    private readonly name: string;
    private readonly blueprint: BlueprintModel;

    constructor(parent: BlueprintModel, token: SlangToken, args: OperatorModelArgs) {
        super(parent, token);
        this.name = args.name;
        this.blueprint = args.blueprint;
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
        return this.getChildNodes<OperatorDelegateModel>(OperatorDelegateModel);
    }

    public findDelegate(name: string): OperatorDelegateModel | undefined {
        return this.scanChildNode<OperatorDelegateModel>(delegate => delegate.getName() === name, OperatorDelegateModel);
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
        for (const delegate of this.getChildNodes<OperatorDelegateModel>(OperatorDelegateModel)) {
            connections.addConnections(delegate.getConnectionsTo());
        }

        return connections;
    }

    // Actions
    public createDelegate(name: string): OperatorDelegateModel {
        return this.createChildNode<OperatorDelegateModel, OperatorDelegateModelArgs>(OperatorDelegateModel, {name});
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


    // Subscriptions

    public subscribeSelectChanged(cb: (selected: boolean) => void): void {
        this.selected.subscribe(cb);
    }

    public subscribeDeleted(cb: () => void): void {
        this.removed.subscribe(cb);
    }
}
