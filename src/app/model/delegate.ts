import {BlueprintPortModel, OperatorPortModel, PortModel, PortModelArgs} from "./port";
import {BlueprintModel} from "./blueprint";
import {OperatorModel} from "./operator";
import {BlackBox, PortOwner} from "../custom/nodes";
import {Connections} from "../custom/connections";
import {StreamType} from "../custom/stream";

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

export type BlueprintDelegateModelArgs = { name: string };

export class BlueprintDelegateModel extends GenericDelegateModel<BlueprintModel, BlueprintPortModel> {
	constructor(owner: BlueprintModel, {name}: BlueprintDelegateModelArgs) {
		super(owner, name);
		this.setBaseStream(new StreamType(null, this, true));
	}

	public createPort(args: PortModelArgs): BlueprintPortModel {
		const port = this.createChildNode(BlueprintPortModel, args);
		port.getStreamPort().subscribeStreamTypeChanged(streamType => {
			this.setBaseStream(streamType);
		});
		return port;
	}

	public getPortIn(): BlueprintPortModel | null {
		return super.getPortIn() as BlueprintPortModel;
	}

	public getPortOut(): BlueprintPortModel | null {
		return super.getPortOut() as BlueprintPortModel;
	}
}

export type OperatorDelegateModelArgs = { name: string };

export class OperatorDelegateModel extends GenericDelegateModel<OperatorModel, OperatorPortModel> {
	constructor(owner: OperatorModel, {name}: OperatorDelegateModelArgs) {
		super(owner, name);
		this.setBaseStream(new StreamType(null, this, false));
	}

	public isStreamSource(): boolean {
		return true;
	}

	public createPort(args: PortModelArgs): OperatorPortModel {
		return this.createChildNode(OperatorPortModel, args);
	}
}