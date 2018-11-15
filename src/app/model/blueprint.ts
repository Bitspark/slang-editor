import {OperatorModel} from './operator';
import {BlueprintPortModel, PortDirection, PortModel} from './port';
import {BlueprintDelegateModel} from './delegate';
import {Geometry} from "./operator";
import {SlangParsing} from "../custom/parsing";
import {PropertyEvaluator} from "../custom/utils";
import {BlackBox} from '../custom/nodes';
import {Connections} from '../custom/connections';
import {TypeIdentifier, SlangType} from "../custom/type";
import {PropertyAssignments, PropertyModel} from "./property";
import {GenericSpecifications} from "./generic";
import {SlangBehaviorSubject, SlangSubject} from '../custom/events';
import {LandscapeModel} from './landscape';

export enum BlueprintType {
	Local,
	Elementary,
	Library,
}

export type BlueprintModelArgs = { fullName: string, type: BlueprintType };

export type BlueprintInstanceAccess = { handle: string, url: string };

export class BlueprintModel extends BlackBox {

	// Topics::self
	private removed = new SlangSubject<void>("removed");
	private selected = new SlangBehaviorSubject<boolean>("selected", false);
	private opened = new SlangBehaviorSubject<boolean>("opened", false);

	// Topics::Deployment
	private deploymentTriggered = new SlangSubject<boolean>("deployment-triggered");
	private deployed = new SlangBehaviorSubject<BlueprintInstanceAccess | undefined>("deployed", undefined);

	// children
	private operatorRemoved = new SlangSubject<OperatorModel>("operator-removed");

	// Properties
	private readonly fullName: string;
	private readonly type: BlueprintType;

	private readonly hierarchy: Array<string> = [];

	private properties: Array<PropertyModel> = [];
	private genericIdentifiers: Set<string>;

	constructor(parent: LandscapeModel, {fullName, type}: BlueprintModelArgs) {
		super(parent);
		this.fullName = fullName;
		this.type = type;
		this.hierarchy = fullName.split('.');
		this.genericIdentifiers = new Set<string>();
	}

	private static revealGenericIdentifiers(port: PortModel): Set<string> {
		let genericIdentifiers = new Set<string>();
		switch (port.getTypeIdentifier()) {
			case TypeIdentifier.Map:
				for (const [_, subPort] of port.getMapSubs()) {
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

	private instantiateOperator(operator: OperatorModel, params?: { props: PropertyAssignments, gen: GenericSpecifications }) {

		function copyAndAddDelegates(owner: OperatorModel, delegate: BlueprintDelegateModel) {
			if (params) {
				for (const expandedDlgName of PropertyEvaluator.expand(delegate.getName(), params.props)) {
					const delegateCopy = owner.createDelegate(expandedDlgName);
					for (const port of delegate.getPorts()) {
						delegateCopy.createPort(port.getType().specifyGenerics(params.gen).expand(params.props), port.getDirection());
					}
				}
			} else {
				const delegateCopy = owner.createDelegate(delegate.getName());
				for (const port of delegate.getPorts()) {
					delegateCopy.createPort(port.getType(), port.getDirection());
				}
			}
		}

		for (const port of this.getPorts()) {
			if (params) {
				operator.createPort(port.getType().specifyGenerics(params.gen).expand(params.props), port.getDirection());
			} else {
				operator.createPort(port.getType(), port.getDirection());
			}
		}
		for (const delegate of this.getDelegates()) {
			copyAndAddDelegates(operator, delegate);
		}
	}

	public createOperator(name: string, blueprint: BlueprintModel, propAssigns: PropertyAssignments, genSpeci: GenericSpecifications): OperatorModel {
		return this.createChildNode(OperatorModel, {name, blueprint}, operator => {
			blueprint.instantiateOperator(operator, {props: propAssigns, gen: genSpeci});
		});
	}

	private getRandomOperatorName(blueprint: BlueprintModel): string {
		const cnt = Array.from(this.getChildNodes(OperatorModel)).filter((op: OperatorModel) => op.getBlueprint() === blueprint).length;
		return `${blueprint.getFullName()}-${cnt + 1}`;
	}

	public createBlankOperator(blueprint: BlueprintModel, geometry: Geometry): OperatorModel {
		const name = this.getRandomOperatorName(blueprint);
		return this.createChildNode(OperatorModel, {name, blueprint, geometry}, operator => {
			blueprint.instantiateOperator(operator);
		});
	}

	public createDelegate(name: string, cb?: (delegate: BlueprintDelegateModel) => void): BlueprintDelegateModel {
		return this.createChildNode(BlueprintDelegateModel, {name}, cb);
	}

	public createPort(type: SlangType, direction: PortDirection): BlueprintPortModel {
		return super.createPortFromType(BlueprintPortModel, type, direction) as BlueprintPortModel;
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

		if (!portInfo || typeof portInfo.instance === 'undefined') {
			return undefined;
		}

		let blackbox: BlackBox | undefined = undefined;
		let port: PortModel | null | undefined = undefined;

		if (portInfo.instance === '') {
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

		const pathSplit = portInfo.port.split('.');
		if (pathSplit.length === 1 && pathSplit[0] === '') {
			return port;
		}

		for (let i = 0; i < pathSplit.length; i++) {
			if (pathSplit[i] === '~') {
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

	public getConnectionsTo(): Connections {
		const connections = new Connections();

		const portIn = this.getPortIn();

		if (portIn) {
			connections.addConnections(portIn.getConnectionsTo());
		}

		for (const operator of this.getOperators()) {
			connections.addConnections(operator.getConnectionsTo());
		}

		for (const delegate of this.getDelegates()) {
			const delegatePortIn = delegate.getPortIn();
			if (delegatePortIn) {
				connections.addConnections(delegatePortIn.getConnectionsTo());
			}
		}

		return connections;
	}

	// Actions

	public addProperty(property: PropertyModel): PropertyModel {
		this.properties.push(property);
		return property
	}

	public select() {
		if (!this.selected.getValue()) {
			this.selected.next(true);
		}
	}

	public deselect() {
		if (this.selected.getValue()) {
			this.selected.next(false);
		}
	}

	public delete() {
		this.removed.next();
	}

	public open() {
		this.opened.next(true);
	}

	public deploy() {
		if (!this.deployed.getValue()) {
			this.deploymentTriggered.next(true);
		}
	}

	public run(instanceAcess: BlueprintInstanceAccess) {
		this.deployed.next(instanceAcess);
	}

	public close() {
		this.opened.next(false);
	}

	// Subscriptions

	public subscribeSelectChanged(cb: (selected: boolean) => void): void {
		this.selected.subscribe(cb);
	}

	public subscribeOpenedChanged(cb: (opened: boolean) => void): void {
		this.opened.subscribe(cb);
	}

	public subscribeDeployed(cb: (instanceAcess: BlueprintInstanceAccess) => void): void {
		this.deployed.subscribe(cb);
	}

	public subscribeDeploymentTriggered(cb: (opened: boolean) => void): void {
		this.deploymentTriggered.subscribe(cb);
	}
}