import {BlueprintModel, BlueprintType} from "./blueprint";
import {OperatorPortModel, PortModelArgs} from "./port";
import {OperatorDelegateModel, OperatorDelegateModelArgs} from "./delegate";
import {PropertyAssignment, PropertyAssignments, PropertyModel} from "./property";
import {BlackBox} from "../custom/nodes";
import {Connections} from "../custom/connections";
import {SlangBehaviorSubject, SlangSubjectTrigger} from "../custom/events";
import {GenericSpecifications} from "../custom/generics";

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
	private selected = new SlangBehaviorSubject<boolean>("selected", false);
	private changed = new SlangSubjectTrigger("changed");

	private readonly name: string;
	private readonly blueprint: BlueprintModel;
	private geometry: OperatorGeometry | undefined;
	private properties: PropertyAssignments;
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

	private removeDelegates() {
		for (const delegate of this.getDelegates()) {
			delegate.destroy();
		}
	}

	private removeMainPorts() {
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

	public hasProperties(): boolean {
		return this.blueprint.hasProperties();
	}

	public getGeometry(): OperatorGeometry | undefined {
		return this.geometry;
	}

	public getPropertyAssignment(property: string | PropertyModel): PropertyAssignment {
		return this.properties.get(property);
	}

	public getPropertyAssignments(): PropertyAssignments {
		return this.properties.copy(this.generics);
	}

	public setPropertyAssignments(propAssignments: PropertyAssignments) {
		if (this.properties.isEqual(propAssignments)) {
			return;
		}

		this.properties = propAssignments;
		this.removeDelegates();
		this.removeMainPorts();
		this.blueprint.instantiateOperator(this);

		this.update();
	}

	public getGenericSpecifications(): GenericSpecifications {
		// TODO return copy to prevent side-effects
		return this.generics;
	}

	public getDisplayName(): string {
		return this.blueprint.getDisplayName();
	}

	public getConnectionsTo(): Connections {
		const connections = new Connections();

		for (const port of this.getPorts()) {
			connections.addConnections(port.getConnectionsTo());
		}

		for (const delegate of this.getDelegates()) {
			connections.addConnections(delegate.getConnectionsTo());
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
				this.geometry = {position: xy}
			} else {
				this.geometry.position = xy;
			}
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
