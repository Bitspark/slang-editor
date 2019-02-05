import {SlangTypeValue} from "../../definitions/type";

import {OperatorGeometry, XY} from "../../definitions/api";
import {BlackBox} from "../abstract/blackbox";
import {PortModelArgs} from "../abstract/port";
import {Connections} from "../abstract/utils/connections";
import {GenericSpecifications} from "../abstract/utils/generics";
import {PropertyAssignments, PropertyEvaluator, PropertyModel} from "../abstract/utils/properties";
import {BlueprintModel, BlueprintType} from "./blueprint";
import {OperatorDelegateModel, OperatorDelegateModelArgs} from "./delegate";
import {OperatorPortModel} from "./port";

export type OperatorModelArgs = {
	name: string,
	blueprint: BlueprintModel,
	geometry?: OperatorGeometry,
	properties?: undefined,
	generics?: undefined,
} | {
	name: string,
	blueprint: BlueprintModel,
	properties: PropertyAssignments,
	generics: GenericSpecifications,
	geometry?: OperatorGeometry,
};

export class OperatorModel extends BlackBox {

	// Topics
	// self
	private readonly name: string;
	private readonly blueprint: BlueprintModel;
	private geometry: OperatorGeometry | undefined;

	// Properties are one single subject
	private readonly properties: PropertyAssignments;

	// Generics have internal, fine-grained subjects
	private readonly generics: GenericSpecifications;

	constructor(parent: BlueprintModel, args: OperatorModelArgs) {
		super(parent, false);
		this.name = args.name;
		this.blueprint = args.blueprint;

		this.geometry = args.geometry;
		if (args.properties && args.generics) {
			this.properties = args.properties;
			this.generics = args.generics;
		} else {
			this.generics = new GenericSpecifications(Array.from(args.blueprint.getGenericIdentifiers()));
			this.properties = new PropertyAssignments(Array.from(args.blueprint.getProperties()), this.generics);
		}
	}

	public getName(): string {
		return this.name;
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

	public getDelegates(): IterableIterator<OperatorDelegateModel> {
		return this.getChildNodes(OperatorDelegateModel);
	}

	public findDelegate(name: string): OperatorDelegateModel | undefined {
		return this.scanChildNode(OperatorDelegateModel, (delegate) => delegate.getName() === name);
	}

	public hasProperties(): boolean {
		return this.blueprint.hasProperties();
	}

	public getGeometry(): OperatorGeometry | undefined {
		return this.geometry;
	}

	public getPropertyValue(property: string | PropertyModel): SlangTypeValue | undefined {
		return this.properties.get(property).getValue();
	}

	public getProperties(): PropertyAssignments {
		return this.properties;
	}

	public getGenerics(): GenericSpecifications {
		// TODO return copy to prevent side-effects
		return this.generics;
	}

	public getDisplayName(): string {
		return this.blueprint.getDisplayName();
	}

	public getConnections(): Connections {
		const connections = new Connections();

		for (const port of this.getPorts()) {
			connections.addAll(port.getConnections());
		}

		for (const delegate of this.getDelegates()) {
			connections.addAll(delegate.getConnections());
		}

		return connections;
	}

	public getConnectionsTo(): Connections {
		const connections = new Connections();

		for (const port of this.getPorts()) {
			connections.addAll(port.getConnectionsTo());
		}

		for (const delegate of this.getDelegates()) {
			connections.addAll(delegate.getConnectionsTo());
		}

		return connections;
	}

	public get xy(): XY | undefined {
		if (this.geometry) {
			return this.geometry.position;
		}
		return undefined;
	}

	public set xy(xy: XY | undefined) {
		if (xy) {
			if (!this.geometry) {
				this.geometry = {position: xy};
			} else {
				this.geometry.position = xy;
			}
		}
	}

	public reconstruct() {
		super.reconstructPorts(this.properties, this.blueprint.getPorts(), OperatorPortModel);

		const obsoleteDelegates = new Set(this.getDelegates());
		for (const delegate of this.blueprint.getDelegates()) {
			for (const expandedDlgName of PropertyEvaluator.expand(delegate.getName(), this.properties)) {
				const opDelegate = this.findDelegate(expandedDlgName);
				if (!opDelegate) {
					const newDelegate = this.createDelegate({name: expandedDlgName});
					for (const port of newDelegate.getPorts()) {
						newDelegate.createPort({
							name: "",
							type: PropertyEvaluator.expandType(port.getType(), this.properties),
							direction: port.getDirection(),
						});
					}
					newDelegate.reconstructPorts(this.properties, delegate.getPorts(), OperatorPortModel);
				} else {
					opDelegate.reconstructPorts(this.properties, delegate.getPorts(), OperatorPortModel);
					obsoleteDelegates.delete(opDelegate);
				}
			}
		}
		obsoleteDelegates.forEach((obsoleteDelegate) => obsoleteDelegate.destroy());
	}

	// Actions
	public createDelegate(args: OperatorDelegateModelArgs): OperatorDelegateModel {
		return this.createChildNode(OperatorDelegateModel, args);
	}
}
