import {BlueprintPortModel, OperatorPortModel, PortDirection, PortModel} from './port';
import {BlueprintModel} from './blueprint';
import {OperatorModel} from './operator';
import {BlackBox, PortOwner} from '../custom/nodes';
import {Connections} from '../custom/connections';
import {SlangType} from "../custom/type";

export abstract class GenericDelegateModel<B extends BlackBox, P extends PortModel> extends PortOwner {
    protected constructor(private owner: B, private name: string) {
        super();
    }

    public getName(): string {
        return this.name;
    }

    public getIdentity(): string {
        return this.getOwner().getIdentity() + '.' + this.name;
    }

    public getOwner(): B {
        return this.owner;
    }

    public getConnections(): Connections {
        const connections = new Connections();

        // First, handle operator out-ports
        if (this.getPortOut()) {
            connections.addConnections(this.getPortOut()!.getConnections());
        }

        return connections;
    }

    public getParentNode(): B {
        return this.owner;
    }

    public getChildNodes(): IterableIterator<P> {
        return (this.getPorts() as IterableIterator<P>);
    }
}

export type DelegateModel = GenericDelegateModel<BlackBox, PortModel>;

export class BlueprintDelegateModel extends GenericDelegateModel<BlueprintModel, BlueprintPortModel> {
    constructor(owner: BlueprintModel, name: string) {
        super(owner, name);
    }

    public createPort(type: SlangType, direction: PortDirection): BlueprintPortModel {
        return super.createPortFromType(BlueprintPortModel, type, direction) as BlueprintPortModel;
    }

}

export class OperatorDelegateModel extends GenericDelegateModel<OperatorModel, OperatorPortModel> {
    constructor(owner: OperatorModel, name: string) {
        super(owner, name);
    }

    public createPort(type: SlangType, direction: PortDirection): OperatorPortModel {
        return super.createPortFromType(OperatorPortModel, type, direction) as OperatorPortModel;
    }
}