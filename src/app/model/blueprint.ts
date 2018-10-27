import {BehaviorSubject, Subject} from "rxjs";
import {OperatorModel} from "./operator";
import {PortModel, PortType} from "./port";
import {DelegateModel} from "./delegate";
import {SlangParsing} from "../utils";

export enum BlueprintType {
    Local,
    Elementary,
    Library
}

/**
 * PortOwners have in and out-ports ans possibly delegates as well as an identity
 */
export interface PortOwner {
    getPortIn(): PortModel | null
    getPortOut(): PortModel | null
    getDisplayName(): string
    getIdentity(): string
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
        this.connections.push(connection);
    }

    public addConnections(connections: Connections) {
        for (const connection of connections.getConnections()) {
            if (connection.source.getOwner() instanceof BlueprintModel || connection.destination.getOwner() instanceof BlueprintModel) {
                // TODO: Find a better solution for this
                continue;
            }
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

    private delegates: Array<DelegateModel> = [];
    private portIn: PortModel | null = null;
    private portOut: PortModel | null = null;
    private readonly operators: Array<OperatorModel> = [];

    constructor(private fullName: string, private type: BlueprintType) {
        this.hierarchy = fullName.split('.');
    }

    public createOperator(name: string, blueprint: BlueprintModel): OperatorModel {
        const operator = blueprint.instantiateOperator(name);
        return this.addOperator(operator);
    }

    public createDelegate(name: string, portIn: PortModel, portOut: PortModel): DelegateModel {
        const delegate = new DelegateModel(name, portIn, portOut);
        return this.addDelegate(delegate);
    }

    private instantiateOperator(name: string): OperatorModel {
        function copyPort(parent: PortModel | null, port: PortModel): PortModel {
            const portCopy = new PortModel(parent, port.getType(), port.isDirectionIn());
            switch (portCopy.getType()) {
                case PortType.Map:
                    for (const entry of port.getMapSubPorts()) {
                        portCopy.addMapSubPort(entry[0], copyPort(portCopy, entry[1]));
                    }
                    break;
                case PortType.Stream:
                    const streamSubPort = port.getStreamSubPort();
                    if (streamSubPort) {
                        portCopy.setStreamSubPort(copyPort(portCopy, streamSubPort));
                    } else {
                        throw `no stream sub port set`;
                    }
                    break;
            }
            return portCopy;
        }

        const operatorPortIn = this.portIn ? copyPort(null, this.portIn) : null;
        const operatorPortOut = this.portOut ? copyPort(null, this.portOut) : null;

        return new OperatorModel(name, this, operatorPortIn, operatorPortOut);
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

    public getDelegates(): IterableIterator<DelegateModel> {
        return this.delegates.values();
    }

    public findOperator(name: string): OperatorModel | undefined {
        return this.operators.find(operator => operator.getName() === name);
    }

    public resolvePortReference(portReference: string): PortModel | null | undefined {
        const portInfo = SlangParsing.parseReferenceString(portReference);
        if (!portInfo || typeof portInfo.instance === 'undefined') {
            return undefined;
        }

        let operatorOrBlueprint: PortOwner | undefined = undefined;
        let port: PortModel | null | undefined = undefined;
        if (portInfo.instance === '') {
            operatorOrBlueprint = this;
        } else {
            operatorOrBlueprint = this.findOperator(portInfo.instance);
        }

        if (!operatorOrBlueprint) {
            return undefined;
        }

        if (portInfo.service === 'main') {
            if (portInfo.directionIn) {
                port = operatorOrBlueprint.getPortIn();
            } else {
                port = operatorOrBlueprint.getPortOut();
            }
        } else if (portInfo.service) {
            if (portInfo.service !== "main" && portInfo.service !== "") {
                throw `services other than main are not supported yet`;
            }
            if (portInfo.directionIn) {
                port = operatorOrBlueprint.getPortIn();
            } else {
                port = operatorOrBlueprint.getPortOut();
            }
        } else if (portInfo.delegate) {
            throw `delegates are not supported yet`;
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
                if (!port) {
                    return null;
                }
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
        return this.getFullName().replace('.', '-');
    }

    public getConnections(): Connections {
        const connections = new Connections();

        // First, handle blueprint in-ports
        if (this.portIn) {
            connections.addConnections(this.portIn.getConnections());
        }

        // Then, handle operator out-ports
        for (const operator of this.operators) {
            const operatorPortOut = operator.getPortOut();
            if (operatorPortOut) {
                connections.addConnections(operatorPortOut.getConnections());
            }
        }

        return connections;
    }

    public getPortIn(): PortModel | null {
        return this.portIn
    }

    public getPortOut(): PortModel | null {
        return this.portOut
    }


    // Actions
    public setPortIn(port: PortModel) {
        this.portIn = port;
        port.setOwner(this);
    }

    public setPortOut(port: PortModel) {
        this.portOut = port;
        port.setOwner(this);
    }

    public addDelegate(delegate: DelegateModel): DelegateModel {
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