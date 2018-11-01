import {BehaviorSubject, Subject} from "rxjs";
import {OperatorModel} from "./operator";
import {BlueprintPortModel, OperatorPortModel, PortDirection, PortModel} from './port';
import {BlueprintDelegateModel, OperatorDelegateModel} from './delegate';
import {SlangParsing} from "../custom/parsing";
import {PropertyEvaluator} from "../custom/utils";
import {BlackBox} from '../custom/nodes';
import {LandscapeModel} from './landscape';
import {Connections} from '../custom/connections';
import {TypeIdentifier, TypeModel} from "./type";
import {PropertyAssignments, PropertyModel} from "./property";
import {GenericSpecifications} from "./generic";

export enum BlueprintType {
    Local,
    Elementary,
    Library
}


export class BlueprintModel extends BlackBox {

    // Topics
    // self
    private removed = new Subject<void>();
    private selected = new BehaviorSubject<boolean>(false);
    private opened = new BehaviorSubject<boolean>(false);

    // children
    private operatorAdded = new Subject<OperatorModel>();
    private operatorRemoved = new Subject<OperatorModel>();
    private operatorSelected = new BehaviorSubject<OperatorModel | null>(null);

    // Properties
    private readonly hierarchy: Array<string> = [];

    private delegates: Array<BlueprintDelegateModel> = [];
    private properties: Array<PropertyModel> = [];
    private operators: Array<OperatorModel> = [];
    private genericIdentifiers: Set<string>;

    constructor(private landscape: LandscapeModel, private fullName: string, private type: BlueprintType) {
        super();
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

    public createOperator(name: string, blueprint: BlueprintModel, propAssigns: PropertyAssignments, genSpeci: GenericSpecifications): OperatorModel {
        const operator = blueprint.instantiateOperator(this, name, propAssigns, genSpeci);
        return this.addOperator(operator);
    }

    public createDelegate(name: string): BlueprintDelegateModel {
        const delegate = new BlueprintDelegateModel(this, name);
        return this.addDelegate(delegate);
    }

    public attachPort(port: BlueprintPortModel) {
        super.attachPort(port);
    }

    private instantiateOperator(owner: BlueprintModel, name: string, propAssigns: PropertyAssignments, genSpeci: GenericSpecifications): OperatorModel {
        function copyPort(owner: OperatorModel | OperatorDelegateModel, parent: OperatorPortModel | null, portType: TypeModel, direction: PortDirection): OperatorPortModel {
            const portCopy = new OperatorPortModel(parent, owner, portType.getTypeIdentifier(), direction);

            switch (portType.getTypeIdentifier()) {
                case TypeIdentifier.Map:
                    for (const entry of portType.getMapSubs()) {
                        for (const portName of PropertyEvaluator.expand(entry[0], propAssigns)) {
                            portCopy.addMapSub(portName, copyPort(owner, portCopy, entry[1], direction));
                        }
                    }
                    break;
                case TypeIdentifier.Stream:
                    portCopy.setStreamSub(copyPort(owner, portCopy, portType.getStreamSub(), direction));
                    break;
            }
            return portCopy;
        }

        function copyAndAddDelegates(owner: OperatorModel, delegate: BlueprintDelegateModel) {
            for (const expandedDlgName of PropertyEvaluator.expand(delegate.getName(), propAssigns)) {
                const delegateCopy = new OperatorDelegateModel(owner, expandedDlgName);
                for (const port of delegate.getPorts()) {
                    delegateCopy.attachPort(copyPort(delegateCopy, null, port.getType().specifyGenerics(genSpeci), port.getDirection()));
                }
                operator.addDelegate(delegateCopy);
            }
        }

        const operator = new OperatorModel(owner, name, this);

        for (const port of this.getPorts()) {
            operator.attachPort(copyPort(operator, null, port.getType().specifyGenerics(genSpeci), port.getDirection()));
        }
        for (const delegate of this.delegates) {
            copyAndAddDelegates(operator, delegate);
        }

        return operator
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
        return this.operators.values();
    }

    public findOperator(name: string): OperatorModel | undefined {
        return this.operators.find(operator => operator.getName() === name);
    }

    public getDelegates(): IterableIterator<BlueprintDelegateModel> {
        return this.delegates.values();
    }

    public findDelegate(name: string): BlueprintDelegateModel | undefined {
        return this.delegates.find(delegate => delegate.getName() === name);
    }

    public getProperties(): IterableIterator<PropertyModel> {
        return this.properties.values();
    }

    public getPorts(): IterableIterator<BlueprintPortModel> {
        return super.getPorts() as IterableIterator<BlueprintPortModel>;
    }

    public getGenericIdentifiers(): IterableIterator<string> {
        this.genericIdentifiers = new Set<string>();
        for (const port of this.getPorts()) {
            this.genericIdentifiers = new Set<string>([...this.genericIdentifiers, ...BlueprintModel.revealGenericIdentifiers(port)]);
        }
        for (const delegate of this.delegates) {
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
        return this.getFullName();
    }

    public getIdentity(): string {
        return this.getFullName().replace(/\./g, '-');
    }

    public getConnections(): Connections {
        const connections = new Connections();

        const portIn = this.getPortIn();

        if (portIn) {
            connections.addConnections(portIn.getConnections());
        }

        for (const operator of this.operators) {
            connections.addConnections(operator.getConnections());
        }

        for (const delegate of this.delegates) {
            const delegatePortIn = delegate.getPortIn();
            if (delegatePortIn) {
                connections.addConnections(delegatePortIn.getConnections());
            }
        }

        return connections;
    }


    // Actions
    public addProperty(property: PropertyModel): PropertyModel {
        this.properties.push(property);
        return property
    }

    public addDelegate(delegate: BlueprintDelegateModel): BlueprintDelegateModel {
        this.delegates.push(delegate);
        return delegate;
    }

    public addOperator(operator: OperatorModel): OperatorModel {
        this.operators.push(operator);
        this.operatorAdded.next(operator);
        const that = this;

        // Subscribe on Delete
        operator.subscribeDeleted(function () {
            that.removeOperator(operator);
            that.operatorRemoved.next(operator);
        });

        // Subscribe on Select
        operator.subscribeSelectChanged(function (selected: boolean) {
            if (selected) {
                const selectedOperatorOrNull = that.operatorSelected.getValue();
                if (selectedOperatorOrNull !== null) {
                    selectedOperatorOrNull.deselect();
                }
                that.operatorSelected.next(operator);
            } else {
                if (that.operatorSelected.getValue() === operator) {
                    that.operatorSelected.next(null);
                } else {
                    // This can happen if that.operatorSelected has already been set to the new value
                }
            }
        });

        return operator;
    }

    private removeOperator(operator: OperatorModel): boolean {
        const index = this.operators.indexOf(operator);
        if (index === -1) {
            return false;
        }
        this.operators.splice(index, 1);
        return true;
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

    public close() {
        this.opened.next(false);
    }

    // Subscriptions

    public subscribeOperatorAdded(cb: (op: OperatorModel) => void): void {
        this.operatorAdded.subscribe(cb);
    }

    public subscribeOperatorRemoved(cb: (op: OperatorModel) => void): void {
        this.operatorRemoved.subscribe(cb);
    }

    public subscribeSelectChanged(cb: (selected: boolean) => void): void {
        this.selected.subscribe(cb);
    }

    public subscribeOpenedChanged(cb: (opened: boolean) => void): void {
        this.opened.subscribe(cb);
    }

    public subscribeDeleted(cb: () => void): void {
        this.removed.subscribe(cb);
    }

    // Slang tree

    getChildNodes(): IterableIterator<BlueprintPortModel | BlueprintDelegateModel | OperatorModel> {
        const children: Array<BlueprintPortModel | BlueprintDelegateModel | OperatorModel> = Array.from(this.getPorts());
        for (const delegate of this.delegates) {
            children.push(delegate);
        }
        for (const operator of this.operators) {
            children.push(operator);
        }
        return children.values();
    }

    getParentNode(): LandscapeModel {
        return this.landscape;
    }

}