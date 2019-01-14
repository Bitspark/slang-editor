import {BlueprintModel, BlueprintType} from "./blueprint";
import {GenericPortModel, OperatorPortModel, PortModelArgs} from "./port";
import {OperatorDelegateModel, OperatorDelegateModelArgs} from "./delegate";
import {BlackBox} from "../custom/nodes";
import {Connections} from "../custom/connections";
import {SlangBehaviorSubject, SlangSubject, SlangSubjectTrigger} from "../custom/events";
import {PropertyAssignments} from "./property";
import {TypeIdentifier} from "../custom/type";
import {GenericSpecifications} from "../custom/generics";

export type OperatorModelArgs = {
	name: string,
	blueprint: BlueprintModel,
	geometry?: Geometry,
	properties?: undefined,
	generics?: undefined,
} | {
	name: string,
	blueprint: BlueprintModel,
	properties: PropertyAssignments,
	generics: GenericSpecifications,
	geometry?: Geometry,
}

export interface Geometry {
	position: [number, number]
}

export class OperatorModel extends BlackBox {

	// Topics
	// self
	private selected = new SlangBehaviorSubject<boolean>("selected", false);
	private changed = new SlangSubjectTrigger("changed");

	private readonly name: string;
	private readonly blueprint: BlueprintModel;
	private readonly geometry: Geometry | undefined;
	private properties: PropertyAssignments;
	private generics: GenericSpecifications;

	constructor(parent: BlueprintModel, args: OperatorModelArgs) {
		super(parent, false);
		this.name = args.name;
		this.blueprint = args.blueprint;

		this.geometry = args.geometry;
		if (args.properties && args.generics) {
			this.properties = args.properties;
			this.generics = args.generics;
		} else {
			this.properties = new PropertyAssignments(Array.from(args.blueprint.getProperties()));
			this.generics = new GenericSpecifications(Array.from(args.blueprint.getGenericIdentifiers()));
		}

		// TODO use same method for properties changed
		this.generics.subscribeGenericsChanged(() => {
			this.update()
		});
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
		return this.createChildNode(OperatorPortModel, args);
	}

	private removePorts() {
		for (const port of this.getPorts()) {
			port.destroy();
		}
	}

	public getDelegates(): IterableIterator<OperatorDelegateModel> {
		return this.getChildNodes(OperatorDelegateModel);
	}

	public findDelegate(name: string): OperatorDelegateModel | undefined {
		return this.scanChildNode(OperatorDelegateModel, delegate => delegate.getName() === name);
	}

	public getPropertyAssignments(): PropertyAssignments {
		return this.properties.copy();
	}

	public setPropertyAssignments(propAssignments: PropertyAssignments) {
		this.properties = propAssignments;
		this.removePorts();
		this.blueprint.instantiateOperator(this);

		this.update();
	}

	public getGenericSpecifications(): GenericSpecifications {
		// TODO return copy to prevent side-effects
		return this.generics;
	}

	public getDisplayName(): string {
		if (this.properties) {
			switch (this.blueprint.getFullName()) {
				case "slang.data.Value":
					const value = this.properties.has("value")
						? this.properties.getByName("value").getValue()
						: "value?";
					const maxLength = 13;
					if (value.length > maxLength) {
						return `"${value.substr(0, maxLength - 2)}..."`;
					} else {
						return `"${value}"`;
					}
				case "slang.data.Evaluate":
					return this.properties.has("expression")
						? this.properties.getByName("expression").getValue()
						: "expression?";
				case "slang.data.Convert":
					const portIn = this.getPortIn();
					const portOut = this.getPortOut();
					if (portIn && portOut) {
						const fromType = TypeIdentifier[portIn.getTypeIdentifier()];
						const toType = TypeIdentifier[portOut.getTypeIdentifier()];
						return `${fromType} → ${toType}`;
					}
			}
		}
		return this.blueprint.getDisplayName();
	}

	public getConnectionsTo(): Connections {
		const connections = new Connections();

		for (const port of this.getPorts()) {
			connections.addConnections(port.getConnectionsTo());
		}

		return connections;
	}

	public get position(): { x: number, y: number } | undefined {
		if (this.geometry) {
			return {x: this.geometry.position[0], y: this.geometry.position[1]};
		}
	}

	// Actions
	public createDelegate(args: OperatorDelegateModelArgs): OperatorDelegateModel {
		return this.createChildNode(OperatorDelegateModel, args);
	}

	public update() {
		this.changed.next();
	}

	public select() {
		if (!this.selected.getValue()) {
			this.selected.next(true);
		}
	}

	public subscribeChanged(cb: () => void): void {
		this.changed.subscribe(cb);
	}
}
