import {BlueprintPortModel, OperatorPortModel, PortModel} from './port';
import {BlueprintModel, Connections, PortOwner} from './blueprint';
import {OperatorModel} from './operator';

export abstract class DelegateModel implements PortOwner {
    private portIn: PortModel | null = null;
    private portOut: PortModel | null = null;

    protected constructor(private owner: PortOwner, private name: string) {
    }

    public getName(): string {
        return this.name;
    }

    public getIdentity(): string {
        return this.getOwner().getIdentity() + '.' + this.name;
    }

    public getOwner(): PortOwner {
        return this.owner;
    }

    protected setPortIn(port: PortModel) {
        this.portIn = port;
    }

    protected setPortOut(port: PortModel) {
        this.portOut = port;
    }

    public getPortIn(): PortModel | null {
        return this.portIn;
    }

    public getPortOut(): PortModel | null {
        return this.portOut;
    }
}

export class BlueprintDelegateModel extends DelegateModel {
    
    constructor(owner: BlueprintModel, name: string) {
        super(owner, name);
    }

    public setPortIn(port: BlueprintPortModel) {
        super.setPortIn(port);
    }

    public setPortOut(port: BlueprintPortModel) {
        super.setPortOut(port);
    }

    public getPortIn(): BlueprintPortModel | null {
        return super.getPortIn();
    }

    public getPortOut(): BlueprintPortModel | null {
        return super.getPortOut();
    }
}

export class OperatorDelegateModel extends DelegateModel {
    constructor(owner: OperatorModel, name: string) {
        super(owner, name);
    }

    public getConnections(): Connections {
        const connections = new Connections();

        // First, handle operator out-ports
        if (this.getPortOut()) {
            connections.addConnections(this.getPortOut()!.getConnections());
        }

        return connections;
    }

    public setPortIn(port: OperatorPortModel) {
        super.setPortIn(port);
    }

    public setPortOut(port: OperatorPortModel) {
        super.setPortOut(port);
    }

    public getPortIn(): OperatorPortModel | null {
        return super.getPortIn();
    }

    public getPortOut(): OperatorPortModel | null {
        return super.getPortOut();
    }
}