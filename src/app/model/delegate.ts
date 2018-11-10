import {BlueprintPortModel, OperatorPortModel, PortDirection, PortModel} from './port';
import {BlueprintModel} from './blueprint';
import {OperatorModel} from './operator';
import {BlackBox, PortOwner, SlangToken} from '../custom/nodes';
import {Connections} from '../custom/connections';
import {SlangType} from "../custom/type";

export abstract class GenericDelegateModel<B extends BlackBox, P extends PortModel> extends PortOwner {
    protected constructor(parent: B, token: SlangToken, private name: string) {
        super(parent, token);
    }

    public getName(): string {
        return this.name;
    }

    public getConnectionsTo(): Connections {
        const connections = new Connections();

        // First, handle operator out-ports
        if (this.getPortOut()) {
            connections.addConnections(this.getPortOut()!.getConnectionsTo());
        }

        return connections;
    }
}

export type DelegateModel = GenericDelegateModel<BlackBox, PortModel>;

export type BlueprintDelegateModelArgs = {name: string};

export class BlueprintDelegateModel extends GenericDelegateModel<BlueprintModel, BlueprintPortModel> {
    constructor(owner: BlueprintModel, token: SlangToken, {name}: BlueprintDelegateModelArgs) {
        super(owner, token, name);
    }

    public createPort(type: SlangType, direction: PortDirection): BlueprintPortModel {
        return super.createPortFromType(BlueprintPortModel, type, direction) as BlueprintPortModel;
    }
    
    public getPortIn(): BlueprintPortModel | null {
        return super.getPortIn() as BlueprintPortModel;
    }

    public getPortOut(): BlueprintPortModel | null {
        return super.getPortOut() as BlueprintPortModel;
    }
}

export type OperatorDelegateModelArgs = {name: string};

export class OperatorDelegateModel extends GenericDelegateModel<OperatorModel, OperatorPortModel> {
    constructor(owner: OperatorModel, token: SlangToken, {name}: OperatorDelegateModelArgs) {
        super(owner, token, name);
    }

    public createPort(type: SlangType, direction: PortDirection): OperatorPortModel {
        return super.createPortFromType(OperatorPortModel, type, direction) as OperatorPortModel;
    }
}