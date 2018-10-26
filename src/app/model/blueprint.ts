import {BehaviorSubject, Subject} from "rxjs";
import {OperatorModel} from "./operator";
import {PortModel, PortType} from "./port";
import {SlangParsing} from "../utils";

export enum BlueprintType {
    Local,
    Elementary,
    Library
}

export interface BlueprintOrOperator {
    getPortIn(): PortModel | null
    getPortOut(): PortModel | null
}

export class BlueprintModel implements BlueprintOrOperator {

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

    private portIn: PortModel | null = null;
    private portOut: PortModel | null = null;
    private readonly operators: Array<OperatorModel> = [];
    
    constructor(private fullName: string, private type: BlueprintType) {
        this.hierarchy = fullName.split('.');
    }

    public createOperator(name: string, blueprint: BlueprintModel): OperatorModel {
        const operator = blueprint.instantiateOperator(name);
        this.addOperator(operator);
        return operator;
    }

    private instantiateOperator(name: string): OperatorModel {
        return new OperatorModel(name, this);
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
    
    public resolvePortReference(portReference: string): PortModel | null | undefined {
        const portInfo = SlangParsing.parseReferenceString(portReference);
        if (!portInfo || typeof portInfo.instance === 'undefined') {
            return undefined;
        }

        let operatorOrBlueprint: BlueprintOrOperator | undefined = undefined;
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

    // Actions
    public setPortIn(port: PortModel) {
        this.portIn = port;
    }

    public setPortOut(port: PortModel) {
        this.portOut = port;
    }

    public getPortIn(): PortModel | null {
        return this.portIn
    }

    public getPortOut(): PortModel | null {
        return this.portOut
    }

    public addOperator(operator: OperatorModel): boolean {
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

        return true;
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