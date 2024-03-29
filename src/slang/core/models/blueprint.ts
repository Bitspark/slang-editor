import {OperatorGeometry, UUID, XY} from "../../definitions/api";
import {SlangParsing} from "../../definitions/parsing";
import {SlangType, TypeIdentifier} from "../../definitions/type";
import {BlackBoxModel} from "../abstract/blackbox";
import {PortModel, PortModelArgs} from "../abstract/port";
import {Connections} from "../abstract/utils/connections";
import {SlangBehaviorSubject, SlangSubjectTrigger} from "../abstract/utils/events";
import {GenericSpecifications} from "../abstract/utils/generics";
import {PropertyAssignments, PropertyModel} from "../abstract/utils/properties";

import {BlueprintDelegateModel, BlueprintDelegateModelArgs} from "./delegate";
import {LandscapeModel} from "./landscape";
import {OperatorModel} from "./operator";
import {BlueprintPortModel} from "./port";

export enum ExecuteStatus {
	Stopped,
	Starting,
	Running,
}

export enum BlueprintType {
	Local,
	Elementary,
	Library,
}

export enum BlueprintFakeGeneric {
	In = "inType",
	Out = "outType",
}

// @ts-ignore
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

export interface RunningOperator {
	handle: string;
	url: string;
	in: SlangType;
	out: SlangType;
}

export interface HasMoveablePortGroups {
	inPosition: number;
	outPosition: number;
}

export class BlueprintModel extends BlackBoxModel implements HasMoveablePortGroups {

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

	public set name(newName: string) {
		this.meta.name = newName;
	}

	public get tags(): string[] {
		return this.meta.tags || [""];
	}

	public get help(): string {
		return this.meta.shortDescription ? this.meta.shortDescription : "";
	}

	public get isStopped(): boolean {
		return this.status === ExecuteStatus.Stopped;
	}

	public get isStarting(): boolean {
		return this.status === ExecuteStatus.Starting;
	}

	public get isRunning(): boolean {
		return this.status === ExecuteStatus.Running;
	}

	public set runningOperator(runningOperator: RunningOperator|null) {
		if (runningOperator) {
			this.run(runningOperator)
			return;
		}
		this.stop()
	}

	public get runningOperator(): RunningOperator|null {
		return this._runningOperator.getValue();
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

	public readonly uuid: UUID;
	public readonly tests: any;

	// Topics::self
	private opened = new SlangBehaviorSubject<boolean>("opened", false);
	private saveChanges = new SlangSubjectTrigger("save-changes");

	// Topics::Run Operator
	private _runningOperator = new SlangBehaviorSubject<RunningOperator | null>("running-operator", null);

	// Properties
	public readonly type: BlueprintType;
	public readonly meta: BlueprintMeta;
	public readonly geometry: BlueprintGeometry;
	private readonly fakeGenerics = new GenericSpecifications(FAKE_GENERIC_VALUES);

	private status: ExecuteStatus = ExecuteStatus.Stopped;
	private properties: PropertyModel[] = [];
	private genericIdentifiers: Set<string>;

	constructor(parent: LandscapeModel, {uuid, type, meta, geometry, tests}: BlueprintModelArgs) {
		super(parent, true);
		this.uuid = uuid;
		this.meta = meta;
		this.type = type;
		this.genericIdentifiers = new Set<string>();
		this.tests = tests;

		this.geometry = {
			size: (geometry && geometry.size) ? geometry.size : {width: 240, height: 147},
			port: (geometry && geometry.port) ? geometry.port : {in: {position: 0}, out: {position: 0}},
		};

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

	public createOperator(name: string | null, blueprint: BlueprintModel, properties: PropertyAssignments, generics: GenericSpecifications, geometry?: OperatorGeometry): OperatorModel {
		return this.createChildNode(OperatorModel, {
			blueprint,
			generics,
			geometry,
			properties,
			name: name ? name : this.getNextOperatorName(blueprint),
		});
	}

	public copyOperator(orig: OperatorModel, position?: XY): OperatorModel {
		return this.createOperator(
			null,
			orig.blueprint,
			orig.getProperties().copy(),
			orig.getGenerics().copy(),
			{position:position? position :{x: 0, y: 0}}
		)
	}

	public deleteOperator(op: OperatorModel)  {
		op.destroy();
	}

	public createBlankOperator(blueprint: BlueprintModel, geometry?: OperatorGeometry): OperatorModel {
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

	public isLocal(): boolean {
		return this.type === BlueprintType.Local;
	}

	public isElementary(): boolean {
		return this.type === BlueprintType.Elementary;
	}

	public getOperators(): IterableIterator<OperatorModel> {
		return this.getChildNodes(OperatorModel);
	}

	public findOperator(name: string): OperatorModel | undefined {
		return this.scanChildNode(OperatorModel, (operator) => operator.name === name);
	}

	public getDelegates(): IterableIterator<BlueprintDelegateModel> {
		return this.getChildNodes(BlueprintDelegateModel);
	}

	public findDelegate(name: string): BlueprintDelegateModel | undefined {
		return this.scanChildNode(BlueprintDelegateModel, (delegate) => delegate.getName() === name);
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

	public hasGenerics(): boolean {
		return Array.from(this.getGenericIdentifiers()).length !== 0;
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

		let blackbox: BlackBoxModel | undefined;
		let port: PortModel | null | undefined;

		if (portInfo.instance === "") {
			blackbox = this;
		} else {
			blackbox = this.findOperator(portInfo.instance);
		}

		if (!blackbox) {
			return undefined;
		}

		if (portInfo.directionIn) {
			port = blackbox.getPortIn();
		} else {
			port = blackbox.getPortOut();
		}

		if (portInfo.delegate) {
			const delegate = blackbox.findDelegate(portInfo.delegate);
			if (!delegate) {
				throw new Error(`[${this.getDisplayName()}:${portInfo.instance}] delegate ${portInfo.delegate} not found`);
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
				try {
					port = port.getStreamSub();
					continue;
				} catch (err) {
					return undefined
				}
			}

			if (port.getTypeIdentifier() !== TypeIdentifier.Map) {
				return null;
			}

			try {
				port = port.findMapSub(pathPart);
			} catch (e) {
				return undefined;
			}
		}

		return port;
	}

	public getDisplayName(): string {
		return this.name;
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
	public updateProperties(props: Iterable<PropertyModel>) {
		this.properties = Array.from(props);
	}

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

	public start() {
		if (this.status === ExecuteStatus.Stopped) {
			this.status = ExecuteStatus.Starting;
			return;
		}

		console.assert(`Blueprint ${this.uuid} is already running or starting.`)
	}

	public run(rop: RunningOperator) {
		this.status = ExecuteStatus.Running
		this._runningOperator.next(rop);
	}

	public stop() {
		this.status = ExecuteStatus.Stopped
		this._runningOperator.next(null);
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

	private getNextOperatorName(blueprint: BlueprintModel): string {
		const operatorBaseName = blueprint.name.toLowerCase().replace(/[^A-Za-z0-9]/g, "").replace(" ", "");
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
