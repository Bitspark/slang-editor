import {OperatorModel} from "./operator";
import {BlueprintPortModel, PortModel, PortModelArgs} from "./port";
import {BlueprintDelegateModel, BlueprintDelegateModelArgs} from "./delegate";
import {Geometry} from "./operator";
import {SlangParsing} from "../custom/parsing";
import {PropertyEvaluator} from "../custom/utils";
import {BlackBox} from "../custom/nodes";
import {SlangTypeValue, TypeIdentifier} from "../custom/type";
import {PropertyAssignments, PropertyModel} from "./property";
import {GenericSpecifications} from "../custom/generics";
import {SlangBehaviorSubject, SlangSubject} from "../custom/events";
import {LandscapeModel} from "./landscape";

export enum BlueprintType {
	Local,
	Elementary,
	Library,
}

export type BlueprintModelArgs = { fullName: string, type: BlueprintType };

export type BlueprintInstance = { handle: string, url: string };

export class BlueprintModel extends BlackBox {
	// Topics::self
	private selected = new SlangBehaviorSubject<boolean>("selected", false);
	private opened = new SlangBehaviorSubject<boolean>("opened", false);

	// Topics::Deployment
	private deploymentRequested = new SlangSubject<boolean>("deployment-triggered");
	public shutdownRequested = new SlangSubject<boolean>("shutdown-triggered");
	private instance = new SlangBehaviorSubject<BlueprintInstance | null>("instance", null);
	private inputPushed = new SlangSubject<SlangTypeValue>("input-pushed");
	private outputPushed = new SlangSubject<SlangTypeValue>("output-pushed");

	// Properties
	private readonly fullName: string;
	private readonly type: BlueprintType;

	private readonly hierarchy: Array<string> = [];

	private properties: Array<PropertyModel> = [];
	private genericIdentifiers: Set<string>;

	constructor(parent: LandscapeModel, {fullName, type}: BlueprintModelArgs) {
		super(parent, true);
		this.fullName = fullName;
		this.type = type;
		this.hierarchy = fullName.split(".");
		this.genericIdentifiers = new Set<string>();
	}

	private static revealGenericIdentifiers(port: PortModel): Set<string> {
		let genericIdentifiers = new Set<string>();
		switch (port.getTypeIdentifier()) {
			case TypeIdentifier.Map:
				for (const subPort of port.getMapSubs()) {
					genericIdentifiers = new Set<string>([...genericIdentifiers, ...BlueprintModel.revealGenericIdentifiers(subPort)]);
				}
				break;
			case TypeIdentifier.Stream:
				const subPort = port.getStreamSub();
				if (subPort) {
					genericIdentifiers = new Set<string>([...genericIdentifiers, ...BlueprintModel.revealGenericIdentifiers(subPort)]);
				}
				break;
			case TypeIdentifier.Generic:
				genericIdentifiers.add(port.getGenericIdentifier());
		}
		return genericIdentifiers;
	}

	private instantiateOperator(operator: OperatorModel) {
		const properties = operator.getPropertyAssignments();
		const generics = operator.getGenericSpecifications();

		function copyAndAddDelegates(owner: OperatorModel, delegate: BlueprintDelegateModel) {
			if (properties && generics) {
				for (const expandedDlgName of PropertyEvaluator.expand(delegate.getName(), properties)) {
					const delegateCopy = owner.createDelegate({name: expandedDlgName});
					for (const port of delegate.getPorts()) {
						delegateCopy.createPort({
							name: "",
							type: port.getType().expand(properties),
							direction: port.getDirection(),
						});
					}
				}
			} else {
				const generics = new GenericSpecifications([]);
				const delegateCopy = owner.createDelegate({name: delegate.getName()});
				for (const port of delegate.getPorts()) {
					delegateCopy.createPort({
						name: "",
						type: port.getType(),
						direction: port.getDirection(),
					});
				}
			}
		}

		for (const port of this.getPorts()) {
			if (properties && generics) {
				operator.createPort({
					name: "",
					type: port.getType().expand(properties),
					direction: port.getDirection(),
				});
			} else {
				operator.createPort({
					name: "",
					type: port.getType(),
					direction: port.getDirection(),
				});
			}
		}
		for (const delegate of this.getDelegates()) {
			copyAndAddDelegates(operator, delegate);
		}
	}

	public createOperator(name: string, blueprint: BlueprintModel, propAssigns: PropertyAssignments, genSpeci: GenericSpecifications): OperatorModel {
		return this.createChildNode(OperatorModel, {
			name,
			blueprint,
			properties: propAssigns,
			generics: genSpeci
		}, operator => {
			blueprint.instantiateOperator(operator);
		});
	}

	private getRandomOperatorName(blueprint: BlueprintModel): string {
		const cnt = Array.from(this.getChildNodes(OperatorModel)).filter((op: OperatorModel) => op.getBlueprint() === blueprint).length;
		return `${blueprint.getFullName()}-${cnt + 1}`;
	}

	public createBlankOperator(blueprint: BlueprintModel, geometry: Geometry): OperatorModel {
		const name = this.getRandomOperatorName(blueprint);
		return this.createChildNode(OperatorModel, {
			name,
			blueprint,
			geometry,
		}, operator => {
			blueprint.instantiateOperator(operator);
		});
	}

	public createDelegate(args: BlueprintDelegateModelArgs, cb?: (delegate: BlueprintDelegateModel) => void): BlueprintDelegateModel {
		return this.createChildNode(BlueprintDelegateModel, args, cb);
	}

	public createPort(args: PortModelArgs): BlueprintPortModel {
		return this.createChildNode(BlueprintPortModel, args);
	}

	public getFullName(): string {
		return this.fullName;
	}

	public getPackageName(level: number): string {
		return this.hierarchy[level];
	}

	public getPackageDepth(): number {
		return this.hierarchy.length;
	}

	public getShortName(): string {
		return this.hierarchy[this.hierarchy.length - 1];
	}

	public isSelected(): boolean {
		return this.selected.getValue();
	}

	public isDeployed(): boolean {
		return this.instance.getValue() !== null;
	}

	public getType(): BlueprintType {
		return this.type;
	}

	public getOperators(): IterableIterator<OperatorModel> {
		return this.getChildNodes(OperatorModel);
	}

	public findOperator(name: string): OperatorModel | undefined {
		return this.scanChildNode(OperatorModel, operator => operator.getName() === name);
	}

	public getDelegates(): IterableIterator<BlueprintDelegateModel> {
		return this.getChildNodes(BlueprintDelegateModel);
	}

	public findDelegate(name: string): BlueprintDelegateModel | undefined {
		return this.scanChildNode(BlueprintDelegateModel, delegate => delegate.getName() === name);
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

		let blackbox: BlackBox | undefined = undefined;
		let port: PortModel | null | undefined = undefined;

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
				throw `services other than main are not supported yet: ${portInfo.service}`;
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
				throw `delegate ${portInfo.delegate} not found`;
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

		for (let i = 0; i < pathSplit.length; i++) {
			if (pathSplit[i] === "~") {
				port = port.getStreamSub();
				continue;
			}

			if (port.getTypeIdentifier() !== TypeIdentifier.Map) {
				return null;
			}

			const mapSubName = pathSplit[i];
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

	// Subscriptions

	public subscribeSelectChanged(cb: (selected: boolean) => void): void {
		this.selected.subscribe(cb);
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
}