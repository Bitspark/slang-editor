import { Subject } from 'rxjs';
import { Surrounding } from './model.ts';

export class Surrounding {

  private operators: Array<Operator>;
  private operatorAdded: Subject<Operator>;

  constructor () {
    this.operators = [];
  }

  public addOperator(op: Operator) {
    this.operators.push(op);
    this.operatorAdded.next(op);
  }

  public subscribeOperatorAdded(callback: (Operator) => void) {
    this.operatorAdded.subscribe(callback);
  }

}

export class Operator {

}

export class PortGroup {

}

export class Port {

}
