import {Connections} from "../custom/connections";
import {GenericSpecifications} from "../custom/generics";
import {BlackBox, PortOwner} from "../custom/nodes";
import {BlueprintModel, FAKE_GENERIC_VALUES} from "./blueprint";
import {OperatorModel} from "./operator";
import {BlueprintPortModel, OperatorPortModel, PortModelArgs} from "./port";

export abstract class GenericDelegateModel<B extends BlackBox> extends PortOwner {
	protected constructor(parent: B, private name: string, streamSource: boolean) {
		super(parent, streamSource);
	}

	public getName(): string {
		return this.name;
	}

	public getConnectionsTo(): Connections {
		const connections = new Connections();

		for (const port of this.getPorts()) {
			connections.addAll(port.getConnectionsTo());
		}

		return connections;
	}

	public getConnections(): Connections {
		const connections = new Connections();

		for (const port of this.getPorts()) {
			connections.addAll(port.getConnections());
		}

		return connections;
	}
}

export type DelegateModel = GenericDelegateModel<BlackBox>;

export interface BlueprintDelegateModelArgs { name: string; }

export class BlueprintDelegateModel extends GenericDelegateModel<BlueprintModel> {
	private readonly fakeGenerics = new GenericSpecifications(FAKE_GENERIC_VALUES);
	constructor(owner: BlueprintModel, {name}: BlueprintDelegateModelArgs) {
		super(owner, name, false);
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

	public getGenerics(): GenericSpecifications {
		return this.fakeGenerics;
	}
}

export interface OperatorDelegateModelArgs { name: string; }

export class OperatorDelegateModel extends GenericDelegateModel<OperatorModel> {
	constructor(owner: OperatorModel, {name}: OperatorDelegateModelArgs) {
		super(owner, name, true);
	}

	public createPort(args: PortModelArgs): OperatorPortModel {
		return this.createChildNode(OperatorPortModel, args);
	}

	public getGenerics(): GenericSpecifications {
		return (this.getParentNode() as OperatorModel).getGenerics();
	}
}
