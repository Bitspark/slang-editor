import {BlueprintPortModel, OperatorPortModel, PortDirection, PortModel, PortModelArgs} from "./port";
import {BlueprintModel} from './blueprint';
import {OperatorModel} from './operator';
import {BlackBox, PortOwner, StreamType} from "../custom/nodes";
import {Connections} from '../custom/connections';
import {SlangType} from "../custom/type";

export abstract class GenericDelegateModel<B extends BlackBox, P extends PortModel> extends PortOwner {
    protected constructor(parent: B, private name: string) {
        super(parent);
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
    constructor(owner: BlueprintModel, {name}: BlueprintDelegateModelArgs) {
        super(owner, name);
    }

    public createPort(args: PortModelArgs): BlueprintPortModel {
        return this.createChildNode(BlueprintPortModel, args);
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
    constructor(owner: OperatorModel, {name}: OperatorDelegateModelArgs) {
        super(owner, name);
    }

    public createPort(args: PortModelArgs): OperatorPortModel {
		const port = this.createChildNode(OperatorPortModel, args);
		if (port.isSource()) {
			if (this.getBaseStreamType()) {
				throw new Error(`operator delegate already has a base stream`);
			}
			this.setBaseStreamType(port.createStream());
		}
		return port;
    }
}