import {BlueprintModel, BlueprintType} from "./blueprint";
import {OperatorPortModel, PortModelArgs} from "./port";
import {OperatorDelegateModel, OperatorDelegateModelArgs} from "./delegate";
import {PropertyAssignments, PropertyModel} from "./property";
import {BlackBox} from "../custom/nodes";
import {Connections} from "../custom/connections";
import {GenericSpecifications} from "../custom/generics";
import {SlangTypeValue} from "../custom/type";
import {Subscription} from "rxjs";
import {SlangBehaviorSubject} from "../custom/events";

export interface XY {
	x: number;
	y: number;
}

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
}

export interface OperatorGeometry {
	position: XY
}

export class OperatorModel extends BlackBox {

	// Topics
	// self
	private readonly name: string;
	private readonly blueprint: BlueprintModel;
	private geometry: OperatorGeometry | undefined;
	
	// Properties are one single subject
	private readonly properties: SlangBehaviorSubject<PropertyAssignments>;
	
	// Generics have internal, fine-grained subjects
	private readonly generics: GenericSpecifications;

	constructor(parent: BlueprintModel, args: OperatorModelArgs) {
		super(parent, false);
		this.name = args.name;
		this.blueprint = args.blueprint;

		this.geometry = args.geometry;
		if (args.properties && args.generics) {
			this.properties = new SlangBehaviorSubject<PropertyAssignments>("properties", args.properties);
			this.generics = args.generics;
		} else {
			this.generics = new GenericSpecifications(Array.from(args.blueprint.getGenericIdentifiers()));
			this.properties = new SlangBehaviorSubject<PropertyAssignments>("properties", new PropertyAssignments(Array.from(args.blueprint.getProperties()), this.generics));
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
		return this.scanChildNode(OperatorDelegateModel, delegate => delegate.getName() === name);
	}

	public hasProperties(): boolean {
		return this.blueprint.hasProperties();
	}

	public getGeometry(): OperatorGeometry | undefined {
		return this.geometry;
	}

	public getPropertyValue(property: string | PropertyModel): SlangTypeValue | undefined {
		return this.properties.getValue().get(property).getValue();
	}

	public getProperties(): PropertyAssignments {
		return this.properties.getValue().copy(this.generics);
	}

	public setProperties(properties: PropertyAssignments) {
		console.log("Update properties...");
		
		if (this.properties.getValue().isEqual(properties)) {
			console.log("... have not changed.");
			return;
		}

		console.log("... changed!");
		
		this.properties.next(properties);
	}

	public getGenerics(): GenericSpecifications {
		// TODO return copy to prevent side-effects
		return this.generics;
	}

	public getDisplayName(): string {
		return this.blueprint.getDisplayName();
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

	public get XY(): XY | undefined {
		if (this.geometry) {
			return this.geometry.position;
		}
		return undefined;
	}

	public set XY(xy: XY | undefined) {
		if (xy) {
			if (!this.geometry) {
				this.geometry = {position: xy};
			} else {
				this.geometry.position = xy;
			}
		}
	}
	
	// public reconstruct(): void {
	// 	// const parentBlueprint = this.getParentNode() as BlueprintModel;
	//
	// 	// const connections = new Connections();
	// 	// for (const delegate of this.getDelegates()) {
	// 	// 	connections.addAll(delegate.getConnections());
	// 	// }
	// 	// for (const port of this.getPorts()) {
	// 	// 	connections.addAll(port.getConnections());
	// 	// }
	// 	//
	// 	// const savedConnections = Array.from(connections).map(connection => ({
	// 	// 	source: getFullPortRef(connection.source),
	// 	// 	destination: getFullPortRef(connection.destination),
	// 	// }));
	//
	// 	for (const delegate of this.getDelegates()) {
	// 		delegate.reconstruct();
	// 	}
	// 	for (const port of this.getPorts()) {
	// 		port.reconstruct(OperatorPortModel);
	// 	}
	//
	// 	// savedConnections.forEach(savedConnection => {
	// 	// 	try {
	// 	// 		const source = parentBlueprint.resolvePortReference(savedConnection.source);
	// 	// 		const destination = parentBlueprint.resolvePortReference(savedConnection.destination);
	// 	// 		if (source && destination) {
	// 	// 			source.connect(destination);
	// 	// 		}
	// 	// 	} catch (e) {
	// 	// 		console.error(`${e}, ${savedConnection.source} -> ${savedConnection.destination}`);
	// 	// 	}
	// 	// });
	// }

	// Actions
	public createDelegate(args: OperatorDelegateModelArgs): OperatorDelegateModel {
		return this.createChildNode(OperatorDelegateModel, args);
	}
	
	public subscribePropertiesChanged(cb: (properties: PropertyAssignments) => void): Subscription {
		return this.properties.subscribe(cb);
	}
}
