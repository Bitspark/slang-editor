/* tslint:disable:no-circular-imports */

import {BlackBox} from "./blackbox";
import {BlueprintModel} from "./blueprint";
import {OperatorModel} from "./operator";
import {BlueprintPortModel, Connections, OperatorPortModel, PortModelArgs} from "./port";
import {PortOwner} from "./port-owner";

export abstract class GenericDelegateModel<B extends BlackBox> extends PortOwner {
	protected constructor(parent: B, private name: string, streamSource: boolean) {
		super(parent, streamSource);
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

export type DelegateModel = GenericDelegateModel<BlackBox>;

export interface BlueprintDelegateModelArgs { name: string; }

export class BlueprintDelegateModel extends GenericDelegateModel<BlueprintModel> {
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
}

export interface OperatorDelegateModelArgs { name: string; }

export class OperatorDelegateModel extends GenericDelegateModel<OperatorModel> {
	constructor(owner: OperatorModel, {name}: OperatorDelegateModelArgs) {
		super(owner, name, true);
	}

	public isStreamSource(): boolean {
		return true;
	}

	public createPort(args: PortModelArgs): OperatorPortModel {
		return this.createChildNode(OperatorPortModel, args);
	}
}
