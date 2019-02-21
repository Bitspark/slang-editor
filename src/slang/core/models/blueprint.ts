import {OperatorGeometry} from "../../definitions/api";
import {SlangParsing} from "../../definitions/parsing";
import {SlangTypeValue, TypeIdentifier} from "../../definitions/type";
import {BlackBox} from "../abstract/blackbox";
import {PortModel, PortModelArgs} from "../abstract/port";
import {Connections} from "../abstract/utils/connections";
import {SlangBehaviorSubject, SlangSubject, SlangSubjectTrigger} from "../abstract/utils/events";
import {GenericSpecifications} from "../abstract/utils/generics";
import {PropertyAssignments, PropertyModel} from "../abstract/utils/properties";
import {BlueprintDelegateModel, BlueprintDelegateModelArgs} from "./delegate";
import {LandscapeModel} from "./landscape";
import {OperatorModel} from "./operator";
import {BlueprintPortModel} from "./port";

export enum BlueprintType {
	Local,
	Elementary,
	Library,
}

export enum BlueprintFakeGeneric {
	In = "inType",
	Out = "outType",
}

export const FAKE_GENERIC_VALUES = Object.keys(BlueprintFakeGeneric).map((key) => BlueprintFakeGeneric[key as any]);

export interface Size {
	width: number;
	height: number;
}

export interface PortGroupGeometry {
	in: {
		position: number,
	};
	out: {
		position: number,
	};
}

export interface BlueprintGeometry {
	size: Size;
	port: PortGroupGeometry;
}

export interface BlueprintMeta {
	name: string;
	icon?: string;
	shortDescription?: string;
	description?: string;
	docUrl?: string;
	tags?: string[];
}

export interface BlueprintModelArgs {
	uuid: string;
	type: BlueprintType;
	meta: BlueprintMeta;
	geometry?: BlueprintGeometry;
	tests?: any;
}

export interface BlueprintInstance {
	handle: string;
	url: string;
}

export interface HasMoveablePortGroups {
	inPosition: number;
	outPosition: number;
}

export class BlueprintModel extends BlackBox implements HasMoveablePortGroups {

	// Geometry

	public get size(): Size {
		return this.geometry.size;
	}

	public set size(size: Size) {
		this.geometry.size = size;
	}

	public get inPosition(): number {
		return this.geometry.port.in.position;
	}

	public set inPosition(pos: number) {
		this.geometry.port.in.position = pos;
	}

	public get outPosition(): number {
		return this.geometry.port.out.position;
	}

	public set outPosition(pos: number) {
		this.geometry.port.out.position = pos;
	}

	public get name(): string {
		return this.meta.name;
	}

	private static revealGenericIdentifiers(port: PortModel): Set<string> {
		const genericIdentifiers = new Set<string>();
		if (port.getTypeIdentifier() === TypeIdentifier.Generic) {
			const identifier = port.getGenericIdentifier();
			if (!identifier) {
				throw new Error(`generic port without identifier`);
			}
			genericIdentifiers.add(identifier);
		} else {
			switch (port.getTypeIdentifier()) {
				case TypeIdentifier.Map: {
					for (const subPort of port.getMapSubs()) {
						BlueprintModel.revealGenericIdentifiers(subPort).forEach((identifier) => genericIdentifiers.add(identifier));
					}
					break;
				}
				case TypeIdentifier.Stream: {
					const subPort = port.getStreamSub();
					if (subPort) {
						BlueprintModel.revealGenericIdentifiers(subPort).forEach((identifier) => genericIdentifiers.add(identifier));
					}
				}
			}
		}
		return genericIdentifiers;
	}

	public readonly uuid: string;
	public readonly tests: any;
	public shutdownRequested = new SlangSubject<boolean>("shutdown-triggered");
	// Topics::self
	private opened = new SlangBehaviorSubject<boolean>("opened", false);
	private saveChanges = new SlangSubjectTrigger("save-changes");

	// Topics::Deployment
	private deploymentRequested = new SlangSubject<boolean>("deployment-triggered");
	private instance = new SlangBehaviorSubject<BlueprintInstance | null>("instance", null);
	private inputPushed = new SlangSubject<SlangTypeValue>("input-pushed");
	private outputPushed = new SlangSubject<SlangTypeValue>("output-pushed");
	private readonly fakeGenerics = new GenericSpecifications(FAKE_GENERIC_VALUES);
	private readonly geometry: BlueprintGeometry;

	// Properties
	private readonly type: BlueprintType;
	private readonly meta: BlueprintMeta;

	private properties: PropertyModel[] = [];
	private genericIdentifiers: Set<string>;

	constructor(parent: LandscapeModel, {uuid, type, meta, geometry, tests}: BlueprintModelArgs) {
		super(parent, true);
		this.uuid = uuid;
		this.meta = meta;
		this.type = type;
		this.genericIdentifiers = new Set<string>();
		this.tests = tests;

		this.geometry = !geometry ? {
			size: {width: 240, height: 147},
			port: {
				in: {
					position: 0,
				},
				out: {
					position: 0,
				},
			},
		} : geometry;

		this.subscribeChildCreated(OperatorModel, (operator) => {
			operator.reconstruct();
			operator.getProperties().subscribeAssignmentChanged(() => {
				operator.reconstruct();
			});
		});
	}

	public getFakeGenerics(): GenericSpecifications {
		return this.fakeGenerics;
	}

	public createOperator(name: string | null, blueprint: BlueprintModel, properties: PropertyAssignments | null, generics: GenericSpecifications | null, geometry?: OperatorGeometry): OperatorModel {
		const operatorGenerics = generics ? generics : new GenericSpecifications([]);
		const operatorProperties = properties ? properties : new PropertyAssignments([], operatorGenerics);
		return this.createChildNode(OperatorModel, {
			name: name ? name : this.getNextOperatorName(blueprint),
			blueprint,
			generics: operatorGenerics,
			properties: operatorProperties,
			geometry,
		});
	}

	public createBlankOperator(blueprint: BlueprintModel, geometry: OperatorGeometry): OperatorModel {
		const name = this.getNextOperatorName(blueprint);
		return this.createChildNode(OperatorModel, {
			name,
			blueprint,
			geometry,
		});
	}

	public createDelegate(args: BlueprintDelegateModelArgs, cb?: (delegate: BlueprintDelegateModel) => void): BlueprintDelegateModel {
		return this.createChildNode(BlueprintDelegateModel, args, cb);
	}

	public createPort(args: PortModelArgs): BlueprintPortModel {
		return this.createChildNode(BlueprintPortModel, args);
	}

	public getShortName(): string {
		return this.name;
	}

	public isDeployed(): boolean {
		return this.instance.getValue() !== null;
	}

	public isLocal(): boolean {
		return this.type === BlueprintType.Local;
	}

	public isElementary(): boolean {
		return this.type === BlueprintType.Elementary;
	}

	public getType(): BlueprintType {
		return this.type;
	}

	public getOperators(): IterableIterator<OperatorModel> {
		return this.getChildNodes(OperatorModel);
	}

	public findOperator(name: string): OperatorModel | undefined {
		return this.scanChildNode(OperatorModel, (operator) => operator.getName() === name);
	}

	public getDelegates(): IterableIterator<BlueprintDelegateModel> {
		return this.getChildNodes(BlueprintDelegateModel);
	}

	public findDelegate(name: string): BlueprintDelegateModel | undefined {
		return this.scanChildNode(BlueprintDelegateModel, (delegate) => delegate.getName() === name);
	}

	public getMeta(): BlueprintMeta {
		return this.meta;
	}

	public getGeometry(): BlueprintGeometry {
		return this.geometry;
	}

	public hasProperties(): boolean {
		return this.properties.length !== 0;
	}

	public getProperties(): IterableIterator<PropertyModel> {
		return this.properties.values();
	}

	public getPorts(): IterableIterator<BlueprintPortModel> {
		return this.getChildNodes(BlueprintPortModel);
	}

	public getPortIn(): BlueprintPortModel | null {
		return super.getPortIn() as BlueprintPortModel;
	}

	public getPortOut(): BlueprintPortModel | null {
		return super.getPortOut() as BlueprintPortModel;
	}

	public getGenericIdentifiers(): IterableIterator<string> {
		this.genericIdentifiers = new Set<string>();
		for (const port of this.getPorts()) {
			this.genericIdentifiers = new Set<string>([...this.genericIdentifiers, ...BlueprintModel.revealGenericIdentifiers(port)]);
		}
		for (const delegate of this.getDelegates()) {
			for (const port of delegate.getPorts()) {
				this.genericIdentifiers = new Set<string>([...this.genericIdentifiers, ...BlueprintModel.revealGenericIdentifiers(port)]);
			}
		}
		return this.genericIdentifiers.values();
	}

	public resolvePortReference(portReference: string): PortModel | null | undefined {
		const portInfo = SlangParsing.parseReferenceString(portReference);

		if (!portInfo || typeof portInfo.instance === "undefined") {
			return undefined;
		}

		let blackbox: BlackBox | undefined;
		let port: PortModel | null | undefined;

		if (portInfo.instance === "") {
			blackbox = this;
		} else {
			blackbox = this.findOperator(portInfo.instance);
		}

		if (!blackbox) {
			return undefined;
		}

		if (portInfo.service) {
			if (portInfo.service !== "main" && portInfo.service !== "") {
				throw new Error(`services other than main are not supported yet: ${portInfo.service}`);
			}
			if (portInfo.directionIn) {
				port = blackbox.getPortIn();
			} else {
				port = blackbox.getPortOut();
			}
		}

		if (portInfo.delegate) {
			const delegate = blackbox.findDelegate(portInfo.delegate);
			if (!delegate) {
				throw new Error(`delegate ${portInfo.delegate} not found`);
			}
			if (portInfo.directionIn) {
				port = delegate.getPortIn();
			} else {
				port = delegate.getPortOut();
			}
		}

		if (!port) {
			return port;
		}

		const pathSplit = portInfo.port.split(".");
		if (pathSplit.length === 1 && pathSplit[0] === "") {
			return port;
		}

		for (const pathPart of pathSplit) {
			if (pathPart === "~") {
				port = port.getStreamSub();
				continue;
			}

			if (port.getTypeIdentifier() !== TypeIdentifier.Map) {
				return null;
			}

			const mapSubName = pathPart;
			port = port.findMapSub(mapSubName);
			if (!port) {
				return undefined;
			}
		}

		return port;
	}

	public getDisplayName(): string {
		return this.getShortName();
	}

	public getInstanceAccess(): BlueprintInstance | null {
		return this.instance.getValue();
	}

	public isStreamSource(): boolean {
		return true;
	}

	public getConnectionsTo(): Connections {
		const connections = new Connections();

		// First, handle blueprint in-ports
		const portIn = this.getPortIn();
		if (portIn) {
			connections.addAll(portIn.getConnectionsTo());
		}

		// Then, handle delegate in-ports
		for (const delegate of this.getChildNodes(BlueprintDelegateModel)) {
			connections.addAll(delegate.getConnectionsTo());
		}

		for (const operator of this.getChildNodes(OperatorModel)) {
			connections.addAll(operator.getConnectionsTo());
		}

		return connections;
	}

	public getGenerics(): GenericSpecifications {
		return this.fakeGenerics;
	}

	// Actions

	public addProperty(property: PropertyModel): PropertyModel {
		this.properties.push(property);
		return property;
	}

	public open() {
		this.opened.next(true);
	}

	public close() {
		this.opened.next(false);
	}

	public pushInput(inputData: SlangTypeValue) {
		if (this.isDeployed()) {
			this.inputPushed.next(inputData);
		}
	}

	public pushOutput(outputData: SlangTypeValue) {
		if (this.isDeployed()) {
			this.outputPushed.next(outputData);
		}
	}

	public requestDeployment() {
		if (!this.isDeployed()) {
			this.deploymentRequested.next(true);
		}
	}

	public requestShutdown() {
		if (this.isDeployed()) {
			this.shutdownRequested.next(true);
		}
	}

	public deploy(instanceAcess: BlueprintInstance) {
		this.instance.next(instanceAcess);
	}

	public shutdown() {
		this.instance.next(null);
	}

	public save() {
		this.saveChanges.next();
	}

	// Subscriptions

	public subscribeSaveChanges(cb: () => void): void {
		this.saveChanges.subscribe(cb);
	}

	public subscribeOpenedChanged(cb: (opened: boolean) => void): void {
		this.opened.subscribe(cb);
	}

	public subscribeDeployed(cb: (instance: BlueprintInstance | null) => void): void {
		this.instance.subscribe(cb);
	}

	public subscribeDeploymentRequested(cb: (opened: boolean) => void): void {
		this.deploymentRequested.subscribe(cb);
	}

	public subscribeShutdownRequested(cb: (opened: boolean) => void): void {
		this.shutdownRequested.subscribe(cb);
	}

	public subscribeInputPushed(cb: (inputData: SlangTypeValue) => void): void {
		this.inputPushed.subscribe(cb);
	}

	public subscribeOutputPushed(cb: (outputData: SlangTypeValue) => void, until?: SlangSubject<any>): void {
		this.outputPushed.subscribe(cb, until);
	}

	private getNextOperatorName(blueprint: BlueprintModel): string {
		const operatorBaseName = blueprint.getShortName().toLowerCase().replace(/[^A-Za-z0-9]/g, "").replace(" ", "");
		if (!this.findOperator(operatorBaseName)) {
			return operatorBaseName;
		}
		let count = 2;
		let operatorName = `${operatorBaseName}-${count}`;
		while (this.findOperator(operatorName)) {
			count++;
			operatorName = `${operatorBaseName}-${count}`;
		}
		return operatorName;
	}
}
