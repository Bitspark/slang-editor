import {BlueprintPortModel, OperatorPortModel, PortModel} from './port';
import {BlueprintModel} from './blueprint';
import {OperatorModel} from './operator';
import {BlackBox, PortOwner} from '../custom/nodes';
import {Connections} from '../custom/connections';

export abstract class DelegateModel extends PortOwner {
    private portIn: PortModel | null = null;
    private portOut: PortModel | null = null;

    protected constructor(private owner: BlackBox, private name: string) {
        super();
    }

    public getName(): string {
        return this.name;
    }

    public getIdentity(): string {
        return this.getOwner().getIdentity() + '.' + this.name;
    }

    protected getOwner(): BlackBox {
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

    public getConnections(): Connections {
        const connections = new Connections();

        // First, handle operator out-ports
        if (this.getPortOut()) {
            connections.addConnections(this.getPortOut()!.getConnections());
        }

        return connections;
    }

    // Slang tree

    isClass(className: string): boolean {
        return className === DelegateModel.name;
    }
}

export class BlueprintDelegateModel extends DelegateModel {

    constructor(parent: BlueprintModel, name: string) {
        super(parent, name);
    }

    public setPortIn(port: BlueprintPortModel) {
        super.setPortIn(port);
    }

    public setPortOut(port: BlueprintPortModel) {
        super.setPortOut(port);
    }

    public getPortIn(): BlueprintPortModel | null {
        return super.getPortIn() as BlueprintPortModel | null;
    }

    public getPortOut(): BlueprintPortModel | null {
        return super.getPortOut() as BlueprintPortModel | null;
    }

    public getParentNode(): BlueprintModel {
        return super.getOwner() as BlueprintModel;
    }

    public isClass(className: string): boolean {
        return super.isClass(className) || className === BlueprintDelegateModel.name;
    }

    public getChildNodes(): IterableIterator<BlueprintPortModel> {
        const children: Array<BlueprintPortModel> = [];
        if (this.getPortIn()) {
            children.push(this.getPortIn()!);
        }
        if (this.getPortOut()) {
            children.push(this.getPortOut()!);
        }
        return children.values();
    }
}

export class OperatorDelegateModel extends DelegateModel {
    constructor(parent: OperatorModel, name: string) {
        super(parent as BlackBox, name);
    }

    public setPortIn(port: OperatorPortModel) {
        super.setPortIn(port);
    }

    public setPortOut(port: OperatorPortModel) {
        super.setPortOut(port);
    }

    public getPortIn(): OperatorPortModel | null {
        return super.getPortIn() as OperatorPortModel | null;
    }

    public getPortOut(): OperatorPortModel | null {
        return super.getPortOut() as OperatorPortModel | null;
    }

    public getParentNode(): OperatorModel {
        return super.getOwner() as OperatorModel;
    }

    public isClass(className: string): boolean {
        return super.isClass(className) || className === OperatorDelegateModel.name;
    }

    public getChildNodes(): IterableIterator<OperatorPortModel> {
        const children: Array<OperatorPortModel> = [];
        if (this.getPortIn()) {
            children.push(this.getPortIn()!);
        }
        if (this.getPortOut()) {
            children.push(this.getPortOut()!);
        }
        return children.values();
    }
}