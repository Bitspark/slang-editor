import '../styles/index.scss';
import {Operator, Surrounding} from './model';
import {JointComponent} from './canvas';

export const sur = new Surrounding();
export const jcomp = new JointComponent('myholder', sur);
sur.subscribeOperatorAdded((op: Operator) => jcomp.addOperator(op));


export function addOperator() {
    sur.addOperator(new Operator());
}

document.getElementById('sl-btn-op-add').addEventListener('click', () => {
    addOperator();
});