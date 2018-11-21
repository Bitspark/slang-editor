import {BlueprintModel, BlueprintType} from "./blueprint";
import {OperatorPortModel, PortModelArgs} from "./port";
import {OperatorDelegateModel} from "./delegate";
import {BlackBox} from "../custom/nodes";
import {Connections} from "../custom/connections";
import {SlangBehaviorSubject} from "../custom/events";
import {StreamType} from "../custom/stream";

export type OperatorModelArgs = { name: string, blueprint: BlueprintModel, geometry: Geometry | undefined };

export interface Geometry {
	position: [number, number]
}

export class OperatorModel extends BlackBox {

	// Topics
	// self
	private selected = new SlangBehaviorSubject<boolean>("selected", false);

	private readonly name: string;
	private readonly blueprint: BlueprintModel;
	private readonly geometry: Geometry | undefined;

	constructor(parent: BlueprintModel, args: OperatorModelArgs) {
		super(parent);
		this.name = args.name;
		this.blueprint = args.blueprint;
		this.geometry = args.geometry;
		this.setBaseStream(new StreamType(null, this, true, true));
	}

	public getName(): string {
		return this.name;
	}

	public isSelected(): boolean {
		return this.selected.getValue();
	}

	public getType(): BlueprintType {
		return this.blueprint.getType();
	}

	public getBlueprint(): BlueprintModel {
		return this.blueprint;
	}

	public createPort(args: PortModelArgs): OperatorPortModel {
		const port = this.createChildNode(OperatorPortModel, args);
		port.subscribeStreamTypeChanged(streamType => {
			this.setBaseStream(streamType);
		});
		return port;
	}

	public getDelegates(): IterableIterator<OperatorDelegateModel> {
		return this.getChildNodes(OperatorDelegateModel);
	}

	public findDelegate(name: string): OperatorDelegateModel | undefined {
		return this.scanChildNode(OperatorDelegateModel, delegate => delegate.getName() === name);
	}

	public getDisplayName(): string {
		return this.blueprint.getShortName();
	}

	public getConnectionsTo(): Connections {
		const connections = new Connections();

		// First, handle operator out-ports
		const portOut = this.getPortOut();
		if (portOut) {
			connections.addConnections(portOut.getConnectionsTo());
		}

		// Then, handle delegate out-ports
		for (const delegate of this.getChildNodes(OperatorDelegateModel)) {
			connections.addConnections(delegate.getConnectionsTo());
		}

		return connections;
	}

	public get position(): { x: number, y: number } | undefined {
		if (this.geometry) {
			return {x: this.geometry.position[0], y: this.geometry.position[1]};
		}
	}

	// Actions
	public createDelegate(name: string): OperatorDelegateModel {
		return this.createChildNode(OperatorDelegateModel, {name});
	}

	public select() {
		if (!this.selected.getValue()) {
			this.selected.next(true);
		}
	}
}
