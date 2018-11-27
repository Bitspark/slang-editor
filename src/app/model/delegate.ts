import {BlueprintPortModel, OperatorPortModel, PortModel, PortModelArgs} from "./port";
import {BlueprintModel} from "./blueprint";
import {OperatorModel} from "./operator";
import {BlackBox, PortOwner} from "../custom/nodes";
import {Connections} from "../custom/connections";
import {GenericSpecifications} from "../custom/generics";

export abstract class GenericDelegateModel<B extends BlackBox, P extends PortModel> extends PortOwner {
	protected constructor(parent: B, private name: string, streamSource: boolean, generics: GenericSpecifications) {
		super(parent, streamSource, generics);
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

export type BlueprintDelegateModelArgs = { name: string, generics: GenericSpecifications };

export class BlueprintDelegateModel extends GenericDelegateModel<BlueprintModel, BlueprintPortModel> {
	constructor(owner: BlueprintModel, {name, generics}: BlueprintDelegateModelArgs) {
		super(owner, name, false, generics);
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

export type OperatorDelegateModelArgs = { name: string, generics: GenericSpecifications };

export class OperatorDelegateModel extends GenericDelegateModel<OperatorModel, OperatorPortModel> {
	constructor(owner: OperatorModel, {name, generics}: OperatorDelegateModelArgs) {
		super(owner, name, true, generics);
	}

	public isStreamSource(): boolean {
		return true;
	}

	public createPort(args: PortModelArgs): OperatorPortModel {
		return this.createChildNode(OperatorPortModel, args);
	}
}