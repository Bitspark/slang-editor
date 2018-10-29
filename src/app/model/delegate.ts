import {BlueprintPortModel, OperatorPortModel, PortModel} from './port';
import {BlueprintModel} from './blueprint';
import {OperatorModel} from './operator';
import {BlackBox, PortOwner} from '../custom/nodes';
import {Connections} from '../custom/connections';

export abstract class GenericDelegateModel<B extends BlackBox, P extends PortModel> extends PortOwner {
    private portIn: P | null = null;
    private portOut: P | null = null;

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

    public setPortIn(port: P) {
        this.portIn = port;
    }

    public setPortOut(port: P) {
        this.portOut = port;
    }

    public getPortIn(): P | null {
        return this.portIn;
    }

    public getPortOut(): P | null {
        return this.portOut;
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
        const children: Array<P> = [];
        if (this.getPortIn()) {
            children.push(this.getPortIn()!);
        }
        if (this.getPortOut()) {
            children.push(this.getPortOut()!);
        }
        return children.values();
    }
}

export type DelegateModel = GenericDelegateModel<BlackBox, PortModel>;

export class BlueprintDelegateModel extends GenericDelegateModel<BlueprintModel, BlueprintPortModel> {
    constructor(owner: BlueprintModel, name: string) {
        super(owner, name);
    }
}

export class OperatorDelegateModel extends GenericDelegateModel<OperatorModel, OperatorPortModel> {
    constructor(owner: OperatorModel, name: string) {
        super(owner, name);
    }
}