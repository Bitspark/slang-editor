import {BehaviorSubject, Subject} from "rxjs";
import {OperatorModel} from "./operator";
import {PortType} from "./port";
import {BlueprintDelegateModel, DelegateModel, OperatorDelegateModel} from './delegate';
import {SlangParsing} from "../utils";
import {BlueprintPortModel} from './port';
import {PortModel} from './port';
import {OperatorPortModel} from './port';

export enum BlueprintType {
    Local,
    Elementary,
    Library
}


/**
 * PortOwners have in and out-ports ans possibly delegates as well as an identity
 */
export interface PortOwner {
    getPortIn(): BlueprintPortModel | null

    getPortOut(): BlueprintPortModel | null

    getIdentity(): string
}

export interface Blackbox extends PortOwner {
    getDisplayName(): string

    findDelegate(name: string): DelegateModel | undefined

    getDelegates(): IterableIterator<DelegateModel>
}


export interface Connection {
    source: PortModel
    destination: PortModel
}

export class Connections {
    private connections: Array<Connection> = [];

    constructor() {
    }

    public getConnections(): IterableIterator<Connection> {
        return this.connections.values();
    }

    public addConnection(connection: Connection) {
        // if (connection.destination.getOwner() instanceof DelegateModel) {
        //     console.log('!!!!!!!!!', connection.destination.getIdentity());
        //     return;
        // }
        this.connections.push(connection);
    }

    public addConnections(connections: Connections) {
        for (const connection of connections.getConnections()) {
            this.connections.push(connection);
        }
    }
}

export class BlueprintModel implements PortOwner {

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
    private portIn: BlueprintPortModel | null = null;
    private portOut: BlueprintPortModel | null = null;
    private readonly operators: Array<OperatorModel> = [];

    constructor(private fullName: string, private type: BlueprintType) {
        this.hierarchy = fullName.split('.');
    }

    public createOperator(name: string, blueprint: BlueprintModel): OperatorModel {
        const operator = blueprint.instantiateOperator(this, name);
        return this.addOperator(operator);
    }

    public createDelegate(name: string): BlueprintDelegateModel {
        const delegate = new BlueprintDelegateModel(this, name);
        return this.addDelegate(delegate);
    }

    private instantiateOperator(owner: BlueprintModel, name: string): OperatorModel {
        function copyPort(owner: OperatorModel | OperatorDelegateModel, parent: OperatorPortModel | null, port: BlueprintPortModel): OperatorPortModel {
            const portCopy = new OperatorPortModel(parent, owner, port.getType(), port.isDirectionIn());
            switch (portCopy.getType()) {
                case PortType.Map:
                    for (const entry of port.getMapSubPorts()) {
                        portCopy.addMapSubPort(entry[0], copyPort(owner, portCopy, entry[1]));
                    }
                    break;
                case PortType.Stream:
                    portCopy.setStreamSubPort(copyPort(owner, portCopy, port.getStreamSubPort()));
                    break;
            }
            return portCopy;
        }

        function copyDelegate(owner: OperatorModel, delegate: BlueprintDelegateModel): OperatorDelegateModel {
            const delegateCopy = new OperatorDelegateModel(owner, delegate.getName());
            if (delegate.getPortIn()) {
                delegateCopy.setPortIn(copyPort(delegateCopy, null, delegate.getPortIn()!));
            }
            if (delegate.getPortOut()) {
                delegateCopy.setPortOut(copyPort(delegateCopy, null, delegate.getPortOut()!));
            }
            return delegateCopy;

        }

        const operator = new OperatorModel(owner, name, this);

        if (this.portIn) {
            operator.setPortIn(copyPort(operator, null, this.portIn));
        }
        if (this.portOut) {
            operator.setPortOut(copyPort(operator, null, this.portOut));
        }
        for (const delegate of this.delegates) {
            operator.addDelegate(copyDelegate(operator, delegate));
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

    public getDelegates(): IterableIterator<DelegateModel> {
        return this.delegates.values();
    }

    public findDelegate(name: string): DelegateModel | undefined {
        return this.delegates.find(delegate => delegate.getName() === name);
    }

    public resolvePortReference(portReference: string): PortModel | null | undefined {
        const portInfo = SlangParsing.parseReferenceString(portReference);
        if (!portInfo || typeof portInfo.instance === 'undefined') {
            return undefined;
        }

        let blackbox: Blackbox | undefined = undefined;
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
                port = port.getStreamSubPort();
                continue;
            }

            if (port.getType() !== PortType.Map) {
                return null;
            }

            const mapSubPortName = pathSplit[i];
            port = port.findMapSubPort(mapSubPortName);
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

        // First, handle blueprint in-ports
        if (this.portIn) {
            connections.addConnections(this.portIn.getConnections());
        }

        // Then, handle operator out-ports
        for (const operator of this.operators) {
            connections.addConnections(operator.getConnections());
        }

        return connections;
    }

    public getPortIn(): BlueprintPortModel | null {
        return this.portIn
    }

    public getPortOut(): BlueprintPortModel | null {
        return this.portOut
    }


    // Actions
    public setPortIn(port: BlueprintPortModel) {
        this.portIn = port;
        port.setOwner(this);
    }

    public setPortOut(port: BlueprintPortModel) {
        this.portOut = port;
        port.setOwner(this);
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

}