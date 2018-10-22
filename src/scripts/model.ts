import {Subject} from 'rxjs';

export class Surrounding {

    private operators: Array<Operator>;
    private operatorAdded = new Subject<Operator>();

    constructor() {
        this.operators = [];
    }

    public addOperator(op: Operator) {
        this.operators.push(op);
        this.operatorAdded.next(op);
    }

    public subscribeOperatorAdded(callback: (op: Operator) => void) {
        this.operatorAdded.subscribe(callback);
    }

}

export class Operator {

}

export class PortGroup {

}

export class Port {

}
